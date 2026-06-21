import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { buildApiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'nexusdial' });
  });

  app.use('/api', buildApiRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
