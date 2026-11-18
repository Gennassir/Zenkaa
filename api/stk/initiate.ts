import {
  initiateHarakaPayStk,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/harakapaye';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  let parsedBody: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    parsedBody = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      parsedBody = {};
    }
  }

  const hostHeader = req.headers['x-forwarded-host'] || req.headers.host;
  const result = await initiateHarakaPayStk(parsedBody, hostHeader);
  res.status(result.statusCode).json(result.payload);
}
