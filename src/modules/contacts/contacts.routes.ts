import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { validate } from '../../middleware/validate';
import { idParam } from '../../lib/validation';
import * as controller from './contacts.controller';
import { listContactsQuerySchema, updateContactSchema } from './contacts.schemas';

export const contactsRouter = Router();

contactsRouter.get('/', validate({ query: listContactsQuerySchema }), asyncHandler(controller.list));

contactsRouter.get('/:id', validate({ params: idParam }), asyncHandler(controller.detail));

contactsRouter.patch(
  '/:id',
  validate({ params: idParam, body: updateContactSchema }),
  asyncHandler(controller.update),
);

contactsRouter.get(
  '/:id/timeline',
  validate({ params: idParam }),
  asyncHandler(controller.timeline),
);

contactsRouter.delete('/:id', validate({ params: idParam }), asyncHandler(controller.remove));
