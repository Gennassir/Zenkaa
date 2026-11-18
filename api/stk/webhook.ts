import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface VercelRequest extends IncomingMessage {
  body?: unknown;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === 'string') {
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function verifyWebhookSignature(
  timestampHeader: string,
  signatureHeader: string,
  rawBody: string
): boolean {
  const signingSecret = (process.env.GATEWAY_SIGNING_SECRET || '').trim();
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  const rawTs = req.headers['x-gateway-timestamp'];
  const rawSig = req.headers['x-gateway-signature'];
  const ts = Array.isArray(rawTs) ? rawTs[0] ?? '' : rawTs ?? '';
  const sig = Array.isArray(rawSig) ? rawSig[0] ?? '' : rawSig ?? '';
  const rawBody = await readRawBody(req);

  if (!verifyWebhookSignature(ts, sig, rawBody)) {
    res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    return;
  }

  res.status(200).json({ received: true });
}
