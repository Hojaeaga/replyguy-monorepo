import Redis from 'ioredis';
import { logger } from '@replyguy/core';
import { QueueOptions, QueueClient } from './types';

export * from './types';

// Define the structure of Redis XREADGROUP response for type safety
type RedisStreamMessage = [string, string[][]]; // [streamName, [[messageId, [field, value]]]]

export function createQueue(options: QueueOptions): QueueClient {
    const redis = new Redis(options.redis.url);

    redis.on('connect', () => {
        logger.info('Connected to Redis');
    });

    redis.on('error', (err) => {
        logger.error('Redis error', err);
    });

    return {
        push: async (queue: string, data: any) => {
            try {
                const id = await redis.xadd(
                    `queue:${queue}`,
                    '*',
                    'data',
                    JSON.stringify(data)
                );
                logger.debug(`Added message to queue ${queue}`, { id });
            } catch (error) {
                logger.error(`Failed to push message to queue ${queue}`, error);
                throw error;
            }
        },
        consume: async (queue: string, processor: (job: any) => Promise<void>) => {
            const consumerGroup = 'replyguy-workers';
            const consumerName = `worker-${Math.floor(Math.random() * 10000)}`;
            const queueKey = `queue:${queue}`;

            // Create consumer group if it doesn't exist
            try {
                await redis.xgroup('CREATE', queueKey, consumerGroup, '$', 'MKSTREAM');
                logger.info(`Created consumer group ${consumerGroup} for queue ${queue}`);
            } catch (err: any) {
                // Ignore BUSYGROUP error, which means the group already exists
                if (!err.message.includes('BUSYGROUP')) {
                    throw err;
                }
            }

            try {
                // Start processing loop
                logger.info(`Started consuming from queue ${queue}`);

                // This will run indefinitely until the process is terminated
                while (true) {
                    try {
                        const response = await redis.xreadgroup(
                            'GROUP', consumerGroup, consumerName,
                            'COUNT', '1',
                            'BLOCK', '2000',
                            'STREAMS', queueKey, '>'
                        ) as RedisStreamMessage[] | null;

                        if (response && response.length > 0) {
                            for (const [_streamName, messages] of response) {
                                for (const [id, fields] of messages) {
                                    // Redis XREADGROUP returns fields as [fieldName1, value1, fieldName2, value2, ...]
                                    // We need to find the 'data' field
                                    for (let i = 0; i < fields.length; i += 2) {
                                        if (fields[i] === 'data' && i + 1 < fields.length) {
                                            const jsonData = fields[i + 1];
                                            try {
                                                const data = JSON.parse(jsonData);
                                                await processor({ id, data });
                                                await redis.xack(queueKey, consumerGroup, id);
                                            } catch (err) {
                                                logger.error(`Error processing message ${id}`, err);
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        logger.error(`Error reading from stream ${queueKey}`, err);
                        // Sleep briefly before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } catch (error) {
                logger.error(`Failed to consume messages from queue ${queue}`, error);
                throw error;
            }
        },
        close: async () => {
            await redis.quit();
            logger.info('Redis connection closed');
        },
    };
}


