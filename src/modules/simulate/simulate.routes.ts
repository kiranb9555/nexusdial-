import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { validate } from '../../middleware/validate';
import * as controller from './simulate.controller';
import { simulateCallSchema } from './simulate.schemas';

export const simulateRouter = Router();

simulateRouter.post(
  '/call',
  validate({ body: simulateCallSchema }),
  asyncHandler(controller.simulateCall),
);
