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

interface SessionTokenPayload {
  r: string;
  c: string;
  a: number;
  p: string;
}

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

function maskPhone(normalized: string): string {
  if (normalized.length < 9) return normalized;
  return `${normalized.slice(0, 6)}***${normalized.slice(-3)}`;
}

function mapGatewayStatus(rawStatus: unknown): 'pending' | 'success' | 'failed' | 'cancelled' | 'expired' {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'failed') return 'failed';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  return 'pending';
}

function verifyStatelessSessionToken(
  token: string,
  expectedCheckoutRequestId: string
): SessionTokenPayload | null {
  const { signingSecret, secretKey } = getGatewayConfig();
  const key = signingSecret || secretKey || 'zenka-fallback-session-key';
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', key)
    .update(encoded, 'utf8')
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionTokenPayload;
    if (!parsed.r || !parsed.c || parsed.c !== expectedCheckoutRequestId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  const rawId = req.query?.checkoutRequestId;
  const checkoutRequestId = Array.isArray(rawId) ? rawId[0] ?? '' : rawId ?? '';
  const rawToken = req.headers['x-session-token'];
  const sessionToken = Array.isArray(rawToken) ? rawToken[0] ?? '' : rawToken ?? '';

  const verified = verifyStatelessSessionToken(sessionToken, checkoutRequestId);
  if (!verified) {
    res.status(404).json({ success: false, message: 'Checkout session not found.' });
    return;
  }

  const { apiUrl, publicKey, secretKey } = getGatewayConfig();
  let status: 'pending' | 'success' | 'failed' | 'cancelled' | 'expired' = 'pending';
  let amount = verified.a;
  let maskedPhone = verified.p;
  let receiptCode: string | null = null;
  let message: string | null = null;

  if (secretKey) {
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${secretKey}`,
      };
      if (publicKey) {
        headers['X-Public-Key'] = publicKey;
      }

      const gwRes = await fetch(
        `${apiUrl}/payments/${encodeURIComponent(verified.r)}`,
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
        status = mapGatewayStatus(gwBody.data.status);
        if (typeof gwBody.data.amount === 'number') {
          amount = gwBody.data.amount;
        }
        if (gwBody.data.phone) {
          maskedPhone = maskPhone(gwBody.data.phone);
        }
        if (gwBody.data.receipt_code) {
          receiptCode = gwBody.data.receipt_code;
        }
        if (gwBody.data.message) {
          message = gwBody.data.message;
        }
      }
    } catch {
      // Keep status pending on transient poll failure
    }
  }

  res.status(200).json({
    success: true,
    status,
    amount,
    maskedPhone,
    receiptCode,
    message,
  });
}
