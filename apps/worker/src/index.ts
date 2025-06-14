import { config } from "dotenv";
import { logger, ReplyCast } from "@replyguy/core";
import QueueService from "@replyguy/queue";
import { NeynarService } from "@replyguy/neynar";
import { AIService } from "@replyguy/ai_service";
import { DBService } from "@replyguy/db";

// Load environment variables
config();
const PORT = process.env.PORT || 3001;

// Initialize clients
const queue = new QueueService({
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
});

const webhookUrl =
  process.env.NODE_ENV === "production"
    ? `${process.env.HOST_URL}/farcaster/webhook/receiveCast`
    : `http://localhost:${PORT}/farcaster/webhook/receiveCast`;

const neynar = new NeynarService(
  process.env.NEYNAR_API_KEY!,
  process.env.NEYNAR_SIGNER_UUID!,
  process.env.NEYNAR_WEBHOOK_ID!,
  webhookUrl,
);

const db = new DBService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

const aiService = new AIService();

// Worker job processor

async function processCast(job: any) {
  const cast = job.data.cast;
  const parentHash = cast.parent_hash;
  const newParentHash = cast.hash;
  logger.info("Processing cast", { castHash: newParentHash });

  // 1. Skip replies or already-processed
  const { data: existingReply } = await db.isCastReplyExists(newParentHash);
  if (existingReply || parentHash) {
    logger.info("Cast is a reply or already replied to", {
      castHash: newParentHash,
    });
    return;
  }

  const startTime = Date.now();
  const castHash = newParentHash;

  // 2. Ensure author is subscribed
  const isSubscribed = await db.isSubscribed(cast.author.fid);
  if (!isSubscribed) {
    logger.info("User not subscribed, skipping", { castHash });
    return;
  }

  try {
    // 3. Generate embeddings for this cast
    const castEmbeddings = await aiService.generateEmbeddings(cast.text);
    if (!castEmbeddings) throw new Error("Failed to generate cast embeddings");

    // 4. Match cast to similar users
    const similarUsersToCast = await db.fetchSimilarUsersToCast(
      castEmbeddings,
      0.6,
      5,
    );

    const similarUserMap = similarUsersToCast.reduce(
      (acc: Record<string, { summary: string }>, user: any) => {
        if (user.fid !== cast.author.fid) {
          acc[user.fid] = { summary: user.summary };
        }
        return acc;
      },
      {} as Record<string, { summary: string }>,
    );

    // 5. Fetch user feeds
    let similarUserFeeds;
    try {
      const userFeedPromises = Object.keys(similarUserMap).map(async (fid) => {
        try {
          const userData = await neynar.fetchCastsForUser(fid);
          return { userData, summary: similarUserMap[fid].summary };
        } catch (error) {
          logger.error("Error fetching user casts", { error, fid, castHash });
          return { userData: null, summary: similarUserMap[fid].summary };
        }
      });
      similarUserFeeds = await Promise.all(userFeedPromises);
    } catch (error) {
      logger.error("Error fetching similar user feeds", { error, castHash });
      throw new Error(`Neynar service error fetching user feeds: ${error}`);
    }

    // 6. Fetch trending feeds
    let trendingFeeds;
    try {
      trendingFeeds = await neynar.fetchTrendingFeeds();
      if (!trendingFeeds) {
        logger.warn("Failed to fetch trending feeds, continuing without them", {
          castHash,
        });
        trendingFeeds = [];
      }
    } catch (error) {
      logger.error("Error fetching trending feeds", { error, castHash });
      trendingFeeds = [];
    }

    // 7. Generate reply
    let receivedData;
    try {
      receivedData = await aiService.generateReplyForCast({
        cast,
        similarUserFeeds,
        trendingFeeds,
      });

      if (!receivedData) {
        throw new Error("AI service returned null/undefined response");
      }
    } catch (error) {
      logger.error("Error generating reply", { error, castHash });
      throw new Error(`AI service error generating reply: ${error}`);
    }

    const { needsReply, replyText, embeds } = receivedData;

    if (needsReply.status) {
      const replyDetails: ReplyCast = {
        text: replyText,
        parentHash: castHash,
        embeds,
      };

      // Post reply
      let replyResult;
      try {
        replyResult = await neynar.replyToCast(replyDetails);
        if (!replyResult) {
          logger.error("Failed to reply to cast - Neynar returned null", {
            castHash,
          });
          return;
        }
      } catch (error) {
        logger.error("Error posting reply", { error, castHash });
        throw new Error(`Neynar service error posting reply: ${error}`);
      }

      await db.addCastReply(castHash, replyResult.cast.hash);
      const processingTime = Date.now() - startTime;
      logger.info("Reply posted", {
        castHash,
        replyHash: replyResult.cast.hash,
        confidence: needsReply.confidence,
        processingTimeMs: processingTime,
      });
    } else {
      const processingTime = Date.now() - startTime;
      logger.info("No reply needed", {
        castHash,
        reason: needsReply.reason,
        processingTimeMs: processingTime,
      });
    }

    await db.updateUserSimilarityFromCast(cast.author.fid, similarUsersToCast);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error("Error processing cast", {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      castHash,
      processingTimeMs: processingTime,
      jobId: job.id,
    });
    throw error;
  }
}

// Start worker
async function startWorker() {
  logger.info("🔧 Starting ReplyGuy worker...");

  // Process cast jobs
  await queue.consume("process-cast", processCast);

  logger.info("✅ Worker is ready to process jobs");
}

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down worker...");
  await queue.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down worker...");
  await queue.close();
  process.exit(0);
});

// Start the worker
startWorker().catch((error) => {
  logger.error("Failed to start worker", error);
  process.exit(1);
});
