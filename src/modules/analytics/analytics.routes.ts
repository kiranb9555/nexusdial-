import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import * as controller from './analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', asyncHandler(controller.summary));
