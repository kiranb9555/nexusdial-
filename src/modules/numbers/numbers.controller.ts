import { Request, Response } from 'express';
import * as service from './numbers.service';
import { requireTenant } from '../../middleware/auth';
import { requireParam } from '../../lib/http';
import { ProvisionNumberInput, UpdateNumberInput } from './numbers.schemas';

export async function list(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const numbers = await service.listNumbers(tenant.id);
  res.status(200).json({ data: numbers });
}

export async function provision(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const number = await service.provisionNumber(tenant.id, req.body as ProvisionNumberInput);
  res.status(201).json(number);
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const number = await service.updateNumber(tenant.id, requireParam(req, 'id'), req.body as UpdateNumberInput);
  res.status(200).json(number);
}
