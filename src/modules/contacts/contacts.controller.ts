import { Request, Response } from 'express';
import * as service from './contacts.service';
import { requireTenant } from '../../middleware/auth';
import { requireParam } from '../../lib/http';
import { ListContactsQuery, UpdateContactInput } from './contacts.schemas';

export async function list(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const query = (req.validatedQuery ?? req.query) as ListContactsQuery;
  const result = await service.listContacts(tenant.id, query);
  res.status(200).json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const contact = await service.getContact(tenant.id, requireParam(req, 'id'));
  res.status(200).json(contact);
}

export async function update(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const contact = await service.updateContact(tenant.id, requireParam(req, 'id'), req.body as UpdateContactInput);
  res.status(200).json(contact);
}

export async function timeline(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const calls = await service.getTimeline(tenant.id, requireParam(req, 'id'));
  res.status(200).json({ data: calls });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const tenant = requireTenant(req);
  const result = await service.softDeleteContact(tenant.id, requireParam(req, 'id'));
  res.status(200).json({ message: 'Contact soft-deleted', ...result });
}
