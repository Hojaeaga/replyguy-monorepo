// Base ReplyGuy Error
export class ReplyGuyError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly metadata?: any;

    constructor(message: string, code: string, statusCode = 500, metadata?: any) {
        super(message);
        this.name = 'ReplyGuyError';
        this.code = code;
        this.statusCode = statusCode;
        this.metadata = metadata;

        // Ensure proper prototype chain
        Object.setPrototypeOf(this, ReplyGuyError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            metadata: this.metadata,
            stack: this.stack,
        };
    }
}

// Configuration Errors
export class ConfigurationError extends ReplyGuyError {
    constructor(message: string, metadata?: any) {
        super(message, 'CONFIGURATION_ERROR', 500, metadata);
        this.name = 'ConfigurationError';
    }
}

// API Errors
export class APIError extends ReplyGuyError {
    constructor(message: string, statusCode = 500, metadata?: any) {
        super(message, 'API_ERROR', statusCode, metadata);
        this.name = 'APIError';
    }
}

export class ValidationError extends ReplyGuyError {
    constructor(message: string, field?: string, metadata?: any) {
        super(message, 'VALIDATION_ERROR', 400, { field, ...metadata });
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends ReplyGuyError {
    constructor(message = 'Authentication failed') {
        super(message, 'AUTHENTICATION_ERROR', 401);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends ReplyGuyError {
    constructor(message = 'Insufficient permissions') {
        super(message, 'AUTHORIZATION_ERROR', 403);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends ReplyGuyError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
        super(message, 'NOT_FOUND_ERROR', 404, { resource, id });
        this.name = 'NotFoundError';
    }
}

export class RateLimitError extends ReplyGuyError {
    constructor(limit: number, windowMs: number) {
        super(`Rate limit exceeded: ${limit} requests per ${windowMs}ms`, 'RATE_LIMIT_ERROR', 429, {
            limit,
            windowMs,
        });
        this.name = 'RateLimitError';
    }
}

// Queue Errors
export class QueueError extends ReplyGuyError {
    constructor(message: string, metadata?: any) {
        super(message, 'QUEUE_ERROR', 500, metadata);
        this.name = 'QueueError';
    }
}

export class JobProcessingError extends ReplyGuyError {
    constructor(jobType: string, jobId: string, originalError?: Error) {
        super(`Failed to process job ${jobType}:${jobId}`, 'JOB_PROCESSING_ERROR', 500, {
            jobType,
            jobId,
            originalError: originalError?.message,
        });
        this.name = 'JobProcessingError';
    }
}

// AI/OpenAI Errors
export class AIError extends ReplyGuyError {
    constructor(message: string, metadata?: any) {
        super(message, 'AI_ERROR', 500, metadata);
        this.name = 'AIError';
    }
}

export class CostLimitError extends ReplyGuyError {
    constructor(currentCost: number, limit: number) {
        super(`AI cost limit exceeded: $${currentCost} >= $${limit}`, 'COST_LIMIT_ERROR', 429, {
            currentCost,
            limit,
        });
        this.name = 'CostLimitError';
    }
}

export class TokenLimitError extends ReplyGuyError {
    constructor(tokenCount: number, limit: number) {
        super(`Token limit exceeded: ${tokenCount} >= ${limit}`, 'TOKEN_LIMIT_ERROR', 400, {
            tokenCount,
            limit,
        });
        this.name = 'TokenLimitError';
    }
}

// Farcaster/Neynar Errors
export class FarcasterError extends ReplyGuyError {
    constructor(message: string, metadata?: any) {
        super(message, 'FARCASTER_ERROR', 500, metadata);
        this.name = 'FarcasterError';
    }
}

export class CastNotFoundError extends ReplyGuyError {
    constructor(castHash: string) {
        super(`Cast with hash '${castHash}' not found`, 'CAST_NOT_FOUND_ERROR', 404, { castHash });
        this.name = 'CastNotFoundError';
    }
}

// Database Errors
export class DatabaseError extends ReplyGuyError {
    constructor(message: string, operation?: string, metadata?: any) {
        super(message, 'DATABASE_ERROR', 500, { operation, ...metadata });
        this.name = 'DatabaseError';
    }
}

// Reclaim/zkTLS Errors
export class ProofVerificationError extends ReplyGuyError {
    constructor(message: string, proofId?: string, metadata?: any) {
        super(message, 'PROOF_VERIFICATION_ERROR', 400, { proofId, ...metadata });
        this.name = 'ProofVerificationError';
    }
}

export class ProofNotFoundError extends ReplyGuyError {
    constructor(proofId: string) {
        super(`Proof with id '${proofId}' not found`, 'PROOF_NOT_FOUND_ERROR', 404, { proofId });
        this.name = 'ProofNotFoundError';
    }
}

// Utility functions for error handling
export const isReplyGuyError = (error: any): error is ReplyGuyError => {
    return error instanceof ReplyGuyError;
};

export const createErrorResponse = (error: Error) => {
    if (isReplyGuyError(error)) {
        return {
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
                metadata: error.metadata,
            },
            success: false,
            timestamp: new Date().toISOString(),
        };
    }

    // Handle unknown errors
    return {
        error: {
            name: 'InternalServerError',
            message: 'An unexpected error occurred',
            code: 'INTERNAL_SERVER_ERROR',
        },
        success: false,
        timestamp: new Date().toISOString(),
    };
};

export const wrapAsyncHandler = <T extends any[], R>(
    fn: (...args: T) => Promise<R>
) => {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            if (isReplyGuyError(error)) {
                throw error;
            }

            // Wrap unknown errors
            throw new ReplyGuyError(
                error instanceof Error ? error.message : 'Unknown error occurred',
                'WRAPPED_ERROR',
                500,
                { originalError: error }
            );
        }
    };
}; 