import { Request, Response } from 'express';
import * as service from './analytics.service';
import { requireTenant } from '../../middleware/auth';

export async function summary(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const result = await service.getSummary(tenant.id);
  res.status(200).json(result);
}
