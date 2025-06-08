import { Embeddings, AIProcessingResponse } from '@replyguy/core';

async function getCastEmbeddings(cast_text: string): Promise<Embeddings> {
    return {
        embeddings: [0.1, 0.2, 0.3]
    };
}

async function sendDataToAIProcessing(data: any): Promise<AIProcessingResponse> {
    // TODO: Fetch data from the Python service
    return {
        needsReply: {
            status: true,
            confidence: 0.8,
            reason: 'No question detected'
        },
        replyText: 'Hello, world!',
        embeds: [
            {
                cast_id: {
                    fid: 14582,
                    hash: '0x123'
                }
            },
            {
                url: 'https://www.replyguy.megabyte0x.xyz'
            }
        ]
    };
}

export { getCastEmbeddings, sendDataToAIProcessing }