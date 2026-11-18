import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import {
  initiateHarakaPayStk,
  mapGatewayStatus,
  queryHarakaPayStatus,
  verifyWebhookSignature,
  type StkStatus,
} from './api/_lib/harakapaye.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WebhookOutcome {
  status: StkStatus;
  receiptCode: string | null;
  message: string | null;
}

const webhookCache = new Map<string, WebhookOutcome>();
const processedWebhookEvents = new Set<string>();

async function startServer() {
  const app = express();

  app.post(
    '/api/stk/webhook',
    express.raw({ type: 'application/json' }),
    (req: Request, res: Response) => {
      const ts = req.header('X-Gateway-Timestamp') ?? '';
      const sig = req.header('X-Gateway-Signature') ?? '';
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

      if (!verifyWebhookSignature(ts, sig, rawBody)) {
        res.sendStatus(401);
        return;
      }

      try {
        const payload = JSON.parse(rawBody) as {
          id?: string;
          data?: {
            reference?: string;
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

        if (payload.data?.reference) {
          webhookCache.set(payload.data.reference, {
            status: mapGatewayStatus(payload.data.status),
            receiptCode: payload.data.receipt_code ?? null,
            message: payload.data.message ?? null,
          });
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
    const hostHeader = req.header('x-forwarded-host') || req.header('host');
    const result = await initiateHarakaPayStk(
      (req.body ?? {}) as Record<string, unknown>,
      hostHeader
    );
    res.status(result.statusCode).json(result.payload);
  });

  app.get('/api/stk/status', async (req: Request, res: Response) => {
    const checkoutRequestId = String(req.query.checkoutRequestId ?? '');
    const token = req.header('X-Session-Token') ?? '';
    const result = await queryHarakaPayStatus(checkoutRequestId, token);

    const payload = result.payload as {
      success?: boolean;
      status?: StkStatus;
      receiptCode?: string | null;
      message?: string | null;
    };

    if (result.statusCode === 200 && payload.success && payload.status === 'pending') {
      const cached = webhookCache.get(checkoutRequestId);
      if (cached && cached.status !== 'pending') {
        payload.status = cached.status;
        if (cached.receiptCode) payload.receiptCode = cached.receiptCode;
        if (cached.message) payload.message = cached.message;
      }
    }

    res.status(result.statusCode).json(payload);
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
