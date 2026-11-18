import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

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

function getCallbackUrl(hostHeader?: string | string[]): string | undefined {
  const rawEnv = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (rawEnv && !rawEnv.includes('MY_APP_URL')) {
    try {
      const parsed = new URL(rawEnv);
      if (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        parsed.hostname !== 'localhost' &&
        parsed.hostname !== '127.0.0.1'
      ) {
        return `${rawEnv}/api/stk/webhook`;
      }
    } catch {
      // ignore invalid APP_URL
    }
  }

  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const vercelHost =
    (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').trim() ||
    (host ? host.trim() : '');

  if (
    vercelHost &&
    !vercelHost.startsWith('localhost') &&
    !vercelHost.startsWith('127.0.0.1')
  ) {
    const cleanHost = vercelHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${cleanHost}/api/stk/webhook`;
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

function createStatelessSessionToken(payload: {
  r: string;
  c: string;
  a: number;
  p: string;
}): string {
  const { signingSecret, secretKey } = getGatewayConfig();
  const key = signingSecret || secretKey || 'zenka-fallback-session-key';
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(encoded, 'utf8').digest('base64url');
  return `${encoded}.${sig}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  const {
    intentType,
    tierPrincipal,
    extensionDays,
    phoneNumber,
    fullName,
    nationalId,
    idempotencyKey,
  } = body;

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

  const { apiUrl, publicKey, secretKey } = getGatewayConfig();
  if (!secretKey) {
    res.status(500).json({
      success: false,
      message:
        'GATEWAY_SECRET_KEY is not configured in Vercel Environment Variables.',
    });
    return;
  }

  const idemKey =
    typeof idempotencyKey === 'string' && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(idemKey).digest('hex').slice(0, 16);
  const externalReference = `ZNK-${hash.toUpperCase()}`;
  const callbackUrl = getCallbackUrl(req.headers['x-forwarded-host'] || req.headers.host);

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
        status?: string;
        amount?: number;
        phone?: string;
        checkout_request_id?: string;
      };
    } | null;

    if (!gwResponse.ok || !gwBody?.success || !gwBody.data?.reference) {
      const errText =
        gwBody?.error ||
        gwBody?.message ||
        `Gateway rejected STK push request (HTTP ${gwResponse.status}).`;
      const statusCode =
        gwResponse.status >= 400 && gwResponse.status < 500 ? gwResponse.status : 502;
      res.status(statusCode).json({ success: false, message: errText });
      return;
    }

    const gatewayReference = gwBody.data.reference;
    const checkoutRequestId = gwBody.data.checkout_request_id || gatewayReference;
    const phoneStr = gwBody.data.phone || normalizedPhone;
    const finalAmount =
      typeof gwBody.data.amount === 'number' ? gwBody.data.amount : feeAmount;
    const finalMaskedPhone = maskPhone(phoneStr);

    const sessionToken = createStatelessSessionToken({
      r: gatewayReference,
      c: checkoutRequestId,
      a: finalAmount,
      p: finalMaskedPhone,
    });

    res.status(200).json({
      success: true,
      duplicate: Boolean(gwBody.duplicate),
      checkoutRequestId,
      gatewayReference,
      sessionToken,
      amount: finalAmount,
      maskedPhone: finalMaskedPhone,
    });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'Payment gateway timed out. Please try again.'
        : 'Unable to reach M-Pesa payment gateway. Please try again.';
    res.status(502).json({ success: false, message: msg });
  }
}
