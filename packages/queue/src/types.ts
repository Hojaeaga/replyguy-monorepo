export interface QueueOptions {
    redis: {
        url: string;
    };
}

export interface QueueClient {
    push: (queue: string, data: any) => Promise<void>;
    consume: (queue: string, processor: (job: any) => Promise<void>) => Promise<void>;
    close: () => Promise<void>;
} 