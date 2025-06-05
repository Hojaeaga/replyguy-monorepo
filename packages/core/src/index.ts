import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
});

// Types
export * from './types';

// Logger
export * from './logger';

// Errors
export * from './errors';

// Utilities
export * from './utils'; 