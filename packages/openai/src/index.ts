import { config } from 'dotenv';
import { logger } from '@replyguy/core'
import { Embeddings, AIProcessingResponse } from '@replyguy/core';

async function getCastEmbeddings(cast_text: string): Promise<Embeddings> {
    return {
        embeddings: [0.1, 0.2, 0.3]
    };
}

async function sendDataToAIProcessing(data: any): Promise<AIProcessingResponse> {
    return {
        needsReply: {
            status: true,
            confidence: 0.8,
            reason: 'No question detected'
        },
        replyText: 'Hello, world!'
    };
}

export { getCastEmbeddings, sendDataToAIProcessing }