import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from 'dotenv';
import { logger } from '@replyguy/core';
import QueueService from '@replyguy/queue';
import { DBService } from '@replyguy/db';
import { NeynarService } from '@replyguy/neynar';
import { UserService } from '@replyguy/user';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize services
const queue = new QueueService({
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
});

const db = new DBService(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
);

const neynar = new NeynarService(
    process.env.NEYNAR_API_KEY!,
    process.env.NEYNAR_SIGNER_UUID!,
);


const userService = new UserService(db, neynar, "");

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ingestion', timestamp: new Date().toISOString() });
});

app.post('/user/register', async (req, res) => {
    try {
        const { fid } = req.body;
        const result = await userService.registerUser(fid);
        res.json(result);
    } catch (error) {
        logger.error('Error registering user', error);
        res.status(500).json({ success: false, error: 'Failed to register user' });
    }
});

// Webhook endpoint for Neynar
app.post('/farcaster/webhook/receiveCast', async (req, res) => {
    try {
        const { body } = req;
        const { type, data: cast } = body;


        logger.info('Received Neynar webhook', {
            castHash: cast ? { hash: cast.hash } : undefined
        });

        // Filter for cast events that might need replies and are not empty
        if (type === 'cast.created' && cast.text !== "") {
            // Push job to queue for processing
            await queue.push('process-cast', {
                cast: cast,
                timestamp: new Date().toISOString(),
            });

            logger.info('Queued cast for processing', { castHash: cast.hash });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('Error processing webhook', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/farcaster/fetchSimilarFIDs', async (req, res) => {
    const { castEmbeddings, match_threshold, match_count } = req.body;
    const similarFIDs = await db.fetchSimilarFIDs(castEmbeddings, match_threshold, match_count);
    res.json(similarFIDs);
});

app.post('/farcaster/fetchCastsForUser', async (req, res) => {
    const { fid } = req.body;
    const casts = await neynar.fetchCastsForUser(fid);
    res.json(casts);
});

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Ingestion service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down ingestion service...');
    await queue.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down ingestion service...');
    await queue.close();
    process.exit(0);
}); 