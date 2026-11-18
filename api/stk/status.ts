import {
  queryHarakaPayStatus,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/harakapaye';

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

  const result = await queryHarakaPayStatus(checkoutRequestId, sessionToken);
  res.status(result.statusCode).json(result.payload);
}
