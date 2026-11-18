import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOAN_TIER_FEES = new Map<number, number>([
  [10000, 99],
  [12500, 129],
  [16000, 179],
  [21000, 199],
  [25500, 219],
  [30000, 349],
  [35000, 419],
  [40000, 539],
  [45000, 679],
  [50000, 959],
  [60000, 1549],
  [70000, 1999],
]);

const EXTENSION_PERCENTS = new Map<number, number>([
  [7, 1.5],
  [14, 2.5],
  [30, 4.2],
]);

type StkStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';

interface StkSession {
  checkoutRequestId: string;
  gatewayReference: string;
  externalReference: string;
  sessionToken: string;
  idempotencyKey: string;
  amount: number;
  maskedPhone: string;
  createdAt: number;
  status: StkStatus;
  receiptCode: string | null;
  message: string | null;
}

const stkSessions = new Map<string, StkSession>();
const gatewayRefIndex = new Map<string, string>();
const externalRefIndex = new Map<string, string>();
const idempotencyIndex = new Map<string, string>();
const processedWebhookEvents = new Set<string>();

function getGatewayConfig() {
  const apiUrl = (process.env.GATEWAY_API_URL || 'https://harakapaye.co.ke/api/v1').replace(
    /\/+$/,
    ''
  );
  const publicKey = (process.env.GATEWAY_PUBLIC_KEY || '').trim();
  const secretKey = (process.env.GATEWAY_SECRET_KEY || '').trim();
  const signingSecret = (process.env.GATEWAY_SIGNING_SECRET || '').trim();
  return { apiUrl, publicKey, secretKey, signingSecret };
}

function getCallbackUrl(): string | undefined {
  const raw = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1' &&
      !raw.includes('MY_APP_URL')
    ) {
      return `${raw}/api/stk/webhook`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) return cleaned.slice(1);
  if (/^254(7|1)\d{8}$/.test(cleaned)) return cleaned;
  if (/^0(7|1)\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  return null;
}

function maskPhone(normalized: string): string {
  if (normalized.length < 9) return normalized;
  return `${normalized.slice(0, 6)}***${normalized.slice(-3)}`;
}

function mapGatewayStatus(rawStatus: unknown): StkStatus {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'failed') return 'failed';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  return 'pending';
}

function buildOrderReference(idempotencyKey: string): string {
  const hash = crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 16);
  return `ZNK-${hash.toUpperCase()}`;
}

async function startServer() {
  const app = express();

  // HarakaPaye webhook endpoint (uses raw body for exact HMAC-SHA256 verification)
  app.post(
    '/api/stk/webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response) => {
      const { signingSecret } = getGatewayConfig();
      if (!signingSecret) {
        res.sendStatus(500);
        return;
      }

      const ts = req.header('X-Gateway-Timestamp') ?? '';
      const sig = req.header('X-Gateway-Signature') ?? '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

      if (!ts || !sig || !rawBody) {
        res.sendStatus(401);
        return;
      }

      const timestampSeconds = Number(ts);
      if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
        res.sendStatus(401);
        return;
      }

      const expected =
        'sha256=' +
        crypto.createHmac('sha256', signingSecret).update(`${ts}.${rawBody}`, 'utf8').digest('hex');

      const sigBuf = Buffer.from(sig);
      const expectedBuf = Buffer.from(expected);
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        res.sendStatus(401);
        return;
      }

      try {
        const payload = JSON.parse(rawBody) as {
          id?: string;
          event?: string;
          data?: {
            reference?: string;
            external_reference?: string;
            status?: string;
            receipt_code?: string | null;
            message?: string | null;
          };
        };

        if (payload.id && processedWebhookEvents.has(payload.id)) {
          res.sendStatus(200);
          return;
        }
        if (payload.id) {
          processedWebhookEvents.add(payload.id);
        }

        const data = payload.data;
        if (data) {
          const sessionId =
            (data.reference && gatewayRefIndex.get(data.reference)) ||
            (data.external_reference && externalRefIndex.get(data.external_reference));

          if (sessionId) {
            const session = stkSessions.get(sessionId);
            if (session) {
              session.status = mapGatewayStatus(data.status);
              if (data.receipt_code) session.receiptCode = data.receipt_code;
              if (data.message) session.message = data.message;
            }
          }
        }
      } catch {
        res.sendStatus(400);
        return;
      }

      res.sendStatus(200);
    }
  );

  app.use(express.json());

  app.post('/api/stk/initiate', async (req: Request, res: Response) => {
    const {
      intentType,
      tierPrincipal,
      extensionDays,
      phoneNumber,
      fullName,
      nationalId,
      idempotencyKey,
    } = req.body ?? {};

    if (intentType !== 'loan_fee' && intentType !== 'extension_fee') {
      res.status(400).json({ success: false, message: 'Invalid checkout request type.' });
      return;
    }

    if (typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ success: false, message: 'Please provide a valid full name.' });
      return;
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      res.status(400).json({
        success: false,
        message: 'Enter a valid Kenyan Safaricom M-Pesa number.',
      });
      return;
    }

    const principalNum = Number(tierPrincipal);
    if (!LOAN_TIER_FEES.has(principalNum)) {
      res.status(400).json({ success: false, message: 'Invalid loan tier selected.' });
      return;
    }

    let feeAmount = 0;
    let description = 'Zenka Fee';
    if (intentType === 'loan_fee') {
      if (typeof nationalId !== 'string' || !/^\d{6,10}$/.test(nationalId.trim())) {
        res.status(400).json({
          success: false,
          message: 'Enter a valid Kenyan National ID (6–10 digits).',
        });
        return;
      }
      feeAmount = LOAN_TIER_FEES.get(principalNum)!;
      description = `Zenka Loan ${principalNum}`;
    } else {
      const daysNum = Number(extensionDays);
      const extPct = EXTENSION_PERCENTS.get(daysNum);
      if (extPct === undefined) {
        res.status(400).json({ success: false, message: 'Invalid extension duration.' });
        return;
      }
      feeAmount = Math.max(10, Math.round((principalNum * extPct) / 100));
      description = `Zenka Ext ${daysNum}d`;
    }

    const idemKey =
      typeof idempotencyKey === 'string' && idempotencyKey.trim()
        ? idempotencyKey.trim()
        : crypto.randomUUID();

    const existingId = idempotencyIndex.get(idemKey);
    if (existingId && stkSessions.has(existingId)) {
      const existing = stkSessions.get(existingId)!;
      if (existing.status === 'pending' || existing.status === 'success') {
        res.json({
          success: true,
          duplicate: true,
          checkoutRequestId: existing.checkoutRequestId,
          gatewayReference: existing.gatewayReference,
          sessionToken: existing.sessionToken,
          amount: existing.amount,
          maskedPhone: existing.maskedPhone,
        });
        return;
      }
    }

    const { apiUrl, publicKey, secretKey } = getGatewayConfig();
    if (!secretKey) {
      res.status(500).json({
        success: false,
        message: 'Payment gateway secret key is not configured on the server.',
      });
      return;
    }

    const externalReference = buildOrderReference(idemKey);
    const callbackUrl = getCallbackUrl();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    };
    if (publicKey) {
      headers['X-Public-Key'] = publicKey;
    }

    const gatewayPayload: Record<string, unknown> = {
      phone: normalizedPhone,
      amount: feeAmount,
      reference: externalReference,
      description: description.slice(0, 60),
    };
    if (callbackUrl) {
      gatewayPayload.callback_url = callbackUrl;
    }

    try {
      const gwResponse = await fetch(`${apiUrl}/stk/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify(gatewayPayload),
        signal: AbortSignal.timeout(25000),
      });

      const gwBody = (await gwResponse.json().catch(() => null)) as {
        success?: boolean;
        duplicate?: boolean;
        message?: string;
        error?: string;
        data?: {
          reference?: string;
          external_reference?: string;
          status?: string;
          amount?: number;
          phone?: string;
          checkout_request_id?: string;
          receipt_code?: string | null;
          message?: string | null;
        };
      } | null;

      if (!gwResponse.ok || !gwBody?.success || !gwBody.data?.reference) {
        const errText =
          gwBody?.error ||
          gwBody?.message ||
          `Gateway rejected STK push request (HTTP ${gwResponse.status}).`;
        res.status(gwResponse.status >= 400 && gwResponse.status < 500 ? gwResponse.status : 502).json({
          success: false,
          message: errText,
        });
        return;
      }

      const gatewayReference = gwBody.data.reference;
      const checkoutRequestId = gwBody.data.checkout_request_id || gatewayReference;
      const sessionToken = crypto.randomBytes(24).toString('hex');
      const phoneStr = gwBody.data.phone || normalizedPhone;

      const session: StkSession = {
        checkoutRequestId,
        gatewayReference,
        externalReference: gwBody.data.external_reference || externalReference,
        sessionToken,
        idempotencyKey: idemKey,
        amount: typeof gwBody.data.amount === 'number' ? gwBody.data.amount : feeAmount,
        maskedPhone: maskPhone(phoneStr),
        createdAt: Date.now(),
        status: mapGatewayStatus(gwBody.data.status),
        receiptCode: gwBody.data.receipt_code ?? null,
        message: gwBody.data.message ?? null,
      };

      stkSessions.set(checkoutRequestId, session);
      gatewayRefIndex.set(gatewayReference, checkoutRequestId);
      externalRefIndex.set(session.externalReference, checkoutRequestId);
      idempotencyIndex.set(idemKey, checkoutRequestId);

      res.json({
        success: true,
        duplicate: Boolean(gwBody.duplicate),
        checkoutRequestId: session.checkoutRequestId,
        gatewayReference: session.gatewayReference,
        sessionToken: session.sessionToken,
        amount: session.amount,
        maskedPhone: session.maskedPhone,
      });
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'TimeoutError'
          ? 'Payment gateway timed out. Please try again.'
          : 'Unable to reach M-Pesa payment gateway. Please try again.';
      res.status(502).json({ success: false, message: msg });
    }
  });

  app.get('/api/stk/status', async (req: Request, res: Response) => {
    const checkoutRequestId = String(req.query.checkoutRequestId ?? '');
    const token = req.header('X-Session-Token') ?? '';

    const session = stkSessions.get(checkoutRequestId);
    if (!session || session.sessionToken !== token) {
      res.status(404).json({ success: false, message: 'Checkout session not found.' });
      return;
    }

    if (session.status === 'pending') {
      const { apiUrl, publicKey, secretKey } = getGatewayConfig();
      if (secretKey) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${secretKey}`,
          };
          if (publicKey) {
            headers['X-Public-Key'] = publicKey;
          }

          const gwRes = await fetch(
            `${apiUrl}/payments/${encodeURIComponent(session.gatewayReference)}`,
            {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(15000),
            }
          );

          const gwBody = (await gwRes.json().catch(() => null)) as {
            success?: boolean;
            data?: {
              status?: string;
              amount?: number;
              phone?: string;
              receipt_code?: string | null;
              message?: string | null;
            };
          } | null;

          if (gwRes.ok && gwBody?.success && gwBody.data) {
            session.status = mapGatewayStatus(gwBody.data.status);
            if (typeof gwBody.data.amount === 'number') {
              session.amount = gwBody.data.amount;
            }
            if (gwBody.data.phone) {
              session.maskedPhone = maskPhone(gwBody.data.phone);
            }
            if (gwBody.data.receipt_code) {
              session.receiptCode = gwBody.data.receipt_code;
            }
            if (gwBody.data.message) {
              session.message = gwBody.data.message;
            }
          }
        } catch {
          // Keep session pending on transient network poll hiccup
        }
      }
    }

    res.json({
      success: true,
      status: session.status,
      amount: session.amount,
      maskedPhone: session.maskedPhone,
      receiptCode: session.receiptCode,
      message: session.message,
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Zenka Web server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
