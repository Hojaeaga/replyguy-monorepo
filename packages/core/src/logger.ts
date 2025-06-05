import pino from 'pino';

// Logger configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Create the logger instance
export const logger = pino({
    level: logLevel,
    transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
            },
        },
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
        service: 'replyguy',
        version: process.env.npm_package_version || '0.0.0',
    },
});

// Helper functions for structured logging
export const createLogger = (service: string) => {
    return logger.child({ service });
};

export const logCastProcessing = (castHash: string, action: string, metadata?: any) => {
    logger.info({
        castHash,
        action,
        ...metadata,
    }, `Cast ${action}`);
};

export const logReplyGenerated = (castHash: string, replyHash: string, confidence: number) => {
    logger.info({
        castHash,
        replyHash,
        confidence,
    }, 'Reply generated and posted');
};

export const logProofVerification = (proofId: string, valid: boolean, reason?: string) => {
    logger.info({
        proofId,
        valid,
        reason,
    }, `Proof ${valid ? 'verified' : 'failed'}`);
};

export const logAPICall = (endpoint: string, method: string, statusCode: number, duration: number) => {
    logger.info({
        endpoint,
        method,
        statusCode,
        duration,
    }, 'API call completed');
};

export const logError = (error: Error, context?: any) => {
    logger.error({
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
        ...context,
    }, 'Error occurred');
};

export const logQueueJob = (jobType: string, jobId: string, status: 'started' | 'completed' | 'failed', duration?: number) => {
    const logData = {
        jobType,
        jobId,
        status,
        ...(duration && { duration }),
    };

    if (status === 'failed') {
        logger.error(logData, `Queue job ${status}`);
    } else {
        logger.info(logData, `Queue job ${status}`);
    }
};

// Performance measurement helpers
export const measureTime = <T>(fn: () => T | Promise<T>, label: string): T | Promise<T> => {
    const start = Date.now();

    const result = fn();

    if (result instanceof Promise) {
        return result.finally(() => {
            const duration = Date.now() - start;
            logger.debug({ duration, label }, 'Operation completed');
        });
    } else {
        const duration = Date.now() - start;
        logger.debug({ duration, label }, 'Operation completed');
        return result;
    }
};

export const withErrorHandling = async <T>(
    fn: () => Promise<T>,
    context: string,
    metadata?: any
): Promise<T | null> => {
    try {
        return await fn();
    } catch (error) {
        logError(error as Error, { context, ...metadata });
        return null;
    }
}; 