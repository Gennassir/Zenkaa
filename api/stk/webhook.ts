import {
  verifyWebhookSignature,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/harakapaye';

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
