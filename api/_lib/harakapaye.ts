import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type StkStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';

export interface VercelRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  send: (body: unknown) => void;
}

export interface SessionTokenPayload {
  r: string; // gatewayReference
  c: string; // checkoutRequestId
  a: number; // amount
  p: string; // maskedPhone
}

export const LOAN_TIER_FEES = new Map<number, number>([
  [10000, 99],
  [15000, 149],
  [21000, 199],
  [30000, 349],
  [45000, 549],
  [60000, 899],
  [80000, 1299],
  [100000, 1699],
  [125000, 2199],
  [150000, 2799],
  [175000, 3399],
  [200000, 3999],
]);

export const EXTENSION_PERCENTS = new Map<number, number>([
  [7, 1.5],
  [14, 2.5],
  [30, 4.2],
]);

export function getGatewayConfig() {
  const apiUrl = (process.env.GATEWAY_API_URL || 'https://harakapaye.co.ke/api/v1').replace(
    /\/+$/,
    ''
  );
  const publicKey = (process.env.GATEWAY_PUBLIC_KEY || '').trim();
  const secretKey = (process.env.GATEWAY_SECRET_KEY || '').trim();
  const signingSecret = (process.env.GATEWAY_SIGNING_SECRET || '').trim();
  return { apiUrl, publicKey, secretKey, signingSecret };
}

export function getCallbackUrl(hostHeader?: string | string[]): string | undefined {
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

export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[\s\-()]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) return cleaned.slice(1);
  if (/^254(7|1)\d{8}$/.test(cleaned)) return cleaned;
  if (/^0(7|1)\d{8}$/.test(cleaned)) return `254${cleaned.slice(1)}`;
  return null;
}

export function maskPhone(normalized: string): string {
  if (normalized.length < 9) return normalized;
  return `${normalized.slice(0, 6)}***${normalized.slice(-3)}`;
}

export function mapGatewayStatus(rawStatus: unknown): StkStatus {
  if (rawStatus === 'success') return 'success';
  if (rawStatus === 'failed') return 'failed';
  if (rawStatus === 'cancelled') return 'cancelled';
  if (rawStatus === 'expired') return 'expired';
  return 'pending';
}

export function buildOrderReference(idempotencyKey: string): string {
  const hash = crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 16);
  return `ZNK-${hash.toUpperCase()}`;
}

function getTokenSigningKey(): string {
  const { signingSecret, secretKey } = getGatewayConfig();
  return signingSecret || secretKey || 'zenka-fallback-session-key';
}

export function createStatelessSessionToken(payload: SessionTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getTokenSigningKey())
    .update(encoded, 'utf8')
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyStatelessSessionToken(
  token: string,
  expectedCheckoutRequestId: string
): SessionTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getTokenSigningKey())
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

export async function initiateHarakaPayStk(
  body: Record<string, unknown>,
  hostHeader?: string | string[]
): Promise<{ statusCode: number; payload: Record<string, unknown> }> {
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
    return {
      statusCode: 400,
      payload: { success: false, message: 'Invalid checkout request type.' },
    };
  }

  if (typeof fullName !== 'string' || fullName.trim().length < 2) {
    return {
      statusCode: 400,
      payload: { success: false, message: 'Please provide a valid full name.' },
    };
  }

  const normalizedPhone = normalizePhone(phoneNumber);
  if (!normalizedPhone) {
    return {
      statusCode: 400,
      payload: {
        success: false,
        message: 'Enter a valid Kenyan Safaricom M-Pesa number.',
      },
    };
  }

  const principalNum = Number(tierPrincipal);
  if (!LOAN_TIER_FEES.has(principalNum)) {
    return {
      statusCode: 400,
      payload: { success: false, message: 'Invalid loan tier selected.' },
    };
  }

  let feeAmount = 0;
  let description = 'Zenka Fee';
  if (intentType === 'loan_fee') {
    if (typeof nationalId !== 'string' || !/^\d{6,10}$/.test(nationalId.trim())) {
      return {
        statusCode: 400,
        payload: {
          success: false,
          message: 'Enter a valid Kenyan National ID (6–10 digits).',
        },
      };
    }
    feeAmount = LOAN_TIER_FEES.get(principalNum)!;
    description = `Zenka Loan ${principalNum}`;
  } else {
    const daysNum = Number(extensionDays);
    const extPct = EXTENSION_PERCENTS.get(daysNum);
    if (extPct === undefined) {
      return {
        statusCode: 400,
        payload: { success: false, message: 'Invalid extension duration.' },
      };
    }
    feeAmount = Math.max(10, Math.round((principalNum * extPct) / 100));
    description = `Zenka Ext ${daysNum}d`;
  }

  const { apiUrl, publicKey, secretKey } = getGatewayConfig();
  if (!secretKey) {
    return {
      statusCode: 500,
      payload: {
        success: false,
        message: 'Payment gateway secret key is not configured on the server.',
      },
    };
  }

  const idemKey =
    typeof idempotencyKey === 'string' && idempotencyKey.trim()
      ? idempotencyKey.trim()
      : crypto.randomUUID();

  const externalReference = buildOrderReference(idemKey);
  const callbackUrl = getCallbackUrl(hostHeader);

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
      };
    } | null;

    if (!gwResponse.ok || !gwBody?.success || !gwBody.data?.reference) {
      const errText =
        gwBody?.error ||
        gwBody?.message ||
        `Gateway rejected STK push request (HTTP ${gwResponse.status}).`;
      const statusCode =
        gwResponse.status >= 400 && gwResponse.status < 500 ? gwResponse.status : 502;
      return {
        statusCode,
        payload: { success: false, message: errText },
      };
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

    return {
      statusCode: 200,
      payload: {
        success: true,
        duplicate: Boolean(gwBody.duplicate),
        checkoutRequestId,
        gatewayReference,
        sessionToken,
        amount: finalAmount,
        maskedPhone: finalMaskedPhone,
      },
    };
  } catch (err) {
    const msg =
      err instanceof Error && err.name === 'TimeoutError'
        ? 'Payment gateway timed out. Please try again.'
        : 'Unable to reach M-Pesa payment gateway. Please try again.';
    return {
      statusCode: 502,
      payload: { success: false, message: msg },
    };
  }
}

export async function queryHarakaPayStatus(
  checkoutRequestId: string,
  sessionToken: string
): Promise<{ statusCode: number; payload: Record<string, unknown> }> {
  const verified = verifyStatelessSessionToken(sessionToken, checkoutRequestId);
  if (!verified) {
    return {
      statusCode: 404,
      payload: { success: false, message: 'Checkout session not found.' },
    };
  }

  const { apiUrl, publicKey, secretKey } = getGatewayConfig();
  let status: StkStatus = 'pending';
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

  return {
    statusCode: 200,
    payload: {
      success: true,
      status,
      amount,
      maskedPhone,
      receiptCode,
      message,
    },
  };
}

export function verifyWebhookSignature(
  timestampHeader: string,
  signatureHeader: string,
  rawBody: string
): boolean {
  const { signingSecret } = getGatewayConfig();
  if (!signingSecret || !timestampHeader || !signatureHeader || !rawBody) {
    return false;
  }

  const timestampSeconds = Number(timestampHeader);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return false;
  }

  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(`${timestampHeader}.${rawBody}`, 'utf8')
      .digest('hex');

  const sigBuf = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
}
