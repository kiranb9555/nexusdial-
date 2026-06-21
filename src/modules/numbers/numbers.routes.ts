import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { validate } from '../../middleware/validate';
import { idParam } from '../../lib/validation';
import * as controller from './numbers.controller';
import { provisionNumberSchema, updateNumberSchema } from './numbers.schemas';

export const numbersRouter = Router();

numbersRouter.get('/', asyncHandler(controller.list));

numbersRouter.post(
  '/',
  validate({ body: provisionNumberSchema }),
  asyncHandler(controller.provision),
);

numbersRouter.patch(
  '/:id',
  validate({ params: idParam, body: updateNumberSchema }),
  asyncHandler(controller.update),
);
