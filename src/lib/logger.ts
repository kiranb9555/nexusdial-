import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, json, errors } = winston.format;

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: 'nexusdial' },
  transports: [new winston.transports.Console()],
});

export type LogMeta = Record<string, unknown>;
