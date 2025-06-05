import { config } from 'dotenv';
import { logger } from '@replyguy/core';
import { createQueue } from '@replyguy/queue';
import { getCastEmbeddings, sendDataToAIProcessing } from '@replyguy/openai';
import { NeynarService } from '@replyguy/neynar';

import { createDBClient } from '@replyguy/db';

// Load environment variables
config();

// Initialize clients
const queue = createQueue({
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
});

const neynar = new NeynarService(
    process.env.NEYNAR_API_KEY!,
    process.env.NEYNAR_SIGNER_UUID!,
);

const db = createDBClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
});

// Worker job processor
async function processCast(job: any) {
    try {
        const cast = job.data;

        logger.info('Processing cast', { castHash: cast.hash });

        const receivedData = await sendDataToAIProcessing(cast);

        const { needsReply, replyText } = receivedData;


        if (needsReply.status) {


            // 5. Post reply via Farcaster
            const replyResult = await neynar.replyToCast({
                text: replyText,
                parentHash: cast.hash,
            });

            // 6. Store interaction in database
            await db.storeInteraction({
                originalCast: cast.hash,
                replyHash: replyResult.hash,
                replyText,
                confidence: needsReply.confidence,
                timestamp: new Date(),
            });

            logger.info('Reply posted', {
                castHash: cast.hash,
                replyHash: replyResult.hash,
                confidence: needsReply.confidence
            });
        } else {
            logger.info('No reply needed', { castHash: cast.hash, reason: needsReply.reason });
        }

    } catch (error) {
        logger.error('Error processing cast', { error, castHash: job.data.castHash });
        throw error;
    }
}

// Start worker
async function startWorker() {
    logger.info('🔧 Starting ReplyGuy worker...');

    // Process cast jobs
    await queue.consume('process-cast', processCast);

    logger.info('✅ Worker is ready to process jobs');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down worker...');
    await queue.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down worker...');
    await queue.close();
    process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
    logger.error('Failed to start worker', error);
    process.exit(1);
}); 