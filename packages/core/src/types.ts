import { z } from 'zod';

// Cast Types
export const CastSchema = z.object({
    hash: z.string(),
    text: z.string(),
    author: z.object({
        fid: z.number(),
        username: z.string(),
        displayName: z.string().optional(),
    }),
    timestamp: z.string(),
    parentHash: z.string().optional(),
    replies: z.number().optional(),
    likes: z.number().optional(),
    recasts: z.number().optional(),
});

export type Cast = z.infer<typeof CastSchema>;

// Queue Job Types
export const QueueJobSchema = z.object({
    id: z.string(),
    type: z.enum(['process-cast', 'verify-proof', 'generate-reply']),
    data: z.record(z.any()),
    timestamp: z.string(),
    attempts: z.number().default(0),
    maxAttempts: z.number().default(3),
});

export type QueueJob = z.infer<typeof QueueJobSchema>;

// Reply Types
export const ReplySchema = z.object({
    originalCastHash: z.string(),
    replyText: z.string(),
    confidence: z.number().min(0).max(1),
    aiModel: z.string(),
    timestamp: z.string(),
    metadata: z.record(z.any()).optional(),
});

export type Reply = z.infer<typeof ReplySchema>;

// User Types
export const UserSchema = z.object({
    fid: z.number(),
    username: z.string(),
    displayName: z.string().optional(),
    bio: z.string().optional(),
    followerCount: z.number().optional(),
    followingCount: z.number().optional(),
    verifiedAddresses: z.array(z.string()).optional(),
});

export type User = z.infer<typeof UserSchema>;

// Proof Types (for Reclaim Protocol)
export const ProofSchema = z.object({
    proofId: z.string(),
    userId: z.string(),
    type: z.string(),
    payload: z.record(z.any()),
    proof: z.record(z.any()),
    verifiedAt: z.string(),
    metadata: z.record(z.any()).optional(),
});

export type Proof = z.infer<typeof ProofSchema>;

// Configuration Types
export const ConfigSchema = z.object({
    openai: z.object({
        apiKey: z.string(),
        maxTokens: z.number().default(4000),
        maxCostPerDay: z.number().default(10),
        model: z.string().default('gpt-4'),
    }),
    neynar: z.object({
        apiKey: z.string(),
        webhookSecret: z.string(),
    }),
    reclaim: z.object({
        appId: z.string(),
        appSecret: z.string(),
    }),
    database: z.object({
        url: z.string(),
        key: z.string(),
    }),
    queue: z.object({
        type: z.enum(['redis', 'sqs']),
        redis: z.object({
            url: z.string(),
        }).optional(),
        sqs: z.object({
            queueUrl: z.string(),
            region: z.string(),
        }).optional(),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

// API Response Types
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

// Event Types
export interface CastEvent {
    type: 'cast.created' | 'cast.updated' | 'cast.deleted';
    cast: Cast;
    timestamp: string;
}

export interface ReplyEvent {
    type: 'reply.created' | 'reply.failed';
    reply: Reply;
    error?: string;
    timestamp: string;
}

export interface ProofEvent {
    type: 'proof.verified' | 'proof.failed';
    proof: Proof;
    error?: string;
    timestamp: string;
}

// Add core types here
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface AIProcessingResponse {
    needsReply: {
        status: boolean;
        confidence: number;
        reason: string | null | undefined;
    };
    replyText: string;
}

export interface Embeddings {
    embeddings: number[];
}