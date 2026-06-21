import { Request, Response } from 'express';
import * as service from './simulate.service';
import { requireTenant } from '../../middleware/auth';
import { SimulateCallInput } from './simulate.schemas';

export async function simulateCall(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const record = await service.simulateCall(tenant.id, req.body as SimulateCallInput);
  res.status(201).json(record);
}
