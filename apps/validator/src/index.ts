import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from 'dotenv';
import { logger } from '@replyguy/core';
import { verifyProof, zkfetch } from '@replyguy/reclaim';
import { createDBClient } from '@replyguy/db';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize database client
const db = createDBClient({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'validator',
        timestamp: new Date().toISOString()
    });
});

// Verify zkTLS proof endpoint
app.post('/verify-proof', async (req, res) => {
    try {
        const { payload, proof, userId } = req.body;

        if (!payload || !proof) {
            return res.status(400).json({
                error: 'Missing required fields: payload and proof'
            });
        }

        logger.info('Verifying zkTLS proof', { userId, proofType: proof.type });

        // Verify the proof using Reclaim Protocol
        const verificationResult = await verifyProof(payload, proof);

        if (verificationResult.valid) {
            // Store verified proof in database
            await db.storeVerifiedProof({
                userId,
                payload,
                proof,
                verifiedAt: new Date(),
                proofType: proof.type || 'unknown',
                metadata: verificationResult.metadata,
            });

            logger.info('Proof verified successfully', {
                userId,
                proofType: proof.type,
                proofId: verificationResult.proofId
            });

            res.json({
                valid: true,
                proofId: verificationResult.proofId,
                metadata: verificationResult.metadata,
                message: 'Proof verified successfully'
            });
        } else {
            logger.warn('Proof verification failed', {
                userId,
                reason: verificationResult.reason
            });

            res.status(400).json({
                valid: false,
                reason: verificationResult.reason,
                message: 'Proof verification failed'
            });
        }

    } catch (error) {
        logger.error('Error verifying proof', { error, userId: req.body.userId });
        res.status(500).json({
            error: 'Internal server error during proof verification'
        });
    }
});

// Generate proof request endpoint (for users to initiate zkTLS proof)
app.post('/generate-proof-request', async (req, res) => {
    try {
        const { userId, target, parameters } = req.body;

        if (!userId || !target) {
            return res.status(400).json({
                error: 'Missing required fields: userId and target'
            });
        }

        logger.info('Generating proof request', { userId, target });

        // Generate a proof request for the specified target
        const proofRequest = await zkfetch.generateProofRequest({
            target,
            parameters: parameters || {},
            appId: process.env.RECLAIM_APP_ID!,
        });

        // Store pending proof request
        await db.storePendingProofRequest({
            userId,
            requestId: proofRequest.requestId,
            target,
            parameters,
            createdAt: new Date(),
            status: 'pending',
        });

        res.json({
            requestId: proofRequest.requestId,
            proofUrl: proofRequest.proofUrl,
            expiresAt: proofRequest.expiresAt,
        });

    } catch (error) {
        logger.error('Error generating proof request', { error, userId: req.body.userId });
        res.status(500).json({
            error: 'Internal server error during proof request generation'
        });
    }
});

// Get proof status endpoint
app.get('/proof-status/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;

        const proofRequest = await db.getProofRequest(requestId);

        if (!proofRequest) {
            return res.status(404).json({ error: 'Proof request not found' });
        }

        res.json({
            requestId,
            status: proofRequest.status,
            createdAt: proofRequest.createdAt,
            completedAt: proofRequest.completedAt,
            target: proofRequest.target,
        });

    } catch (error) {
        logger.error('Error fetching proof status', { error, requestId: req.params.requestId });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    logger.info(`🔐 Validator service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down validator service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Shutting down validator service...');
    process.exit(0);
}); 