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

const webhookUrl = process.env.NODE_ENV === "production" ? `${process.env.HOST_URL}/farcaster/webhook/receiveCast` : `http://localhost:${PORT}/farcaster/webhook/receiveCast`;

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
  const cast = job.data;
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
  let castHash = 'unknown';

  // 2. Ensure author is subscribed
  const isSubscribed = await db.isSubscribed(cast.author.fid);
  if (!isSubscribed) {
    logger.info("User not subscribed, skipping", { castHash: newParentHash });
    return;
  }

  try {
    // 3. Generate embeddings for this cast
    const castEmbeddings = await aiService.generateEmbeddings(cast.text);
    if (!castEmbeddings) throw new Error("Failed to generate cast embeddings");

    // 4. Match cast to similar users (NEW)
    const similarUsersToCast = await db.fetchSimilarUsersToCast(
      castEmbeddings,
      0.6,
      5,
    );

    const similarUserMap = similarUsersToCast.reduce(
      (acc, user) => {
        if (user.fid !== cast.author.fid) {
          acc[user.fid] = { summary: user.summary };
        }
        return acc;
      },
      {} as Record<string, { summary: string }>,
    );

    // 5. Fetch relevant feeds
    const userFeedPromises = Object.keys(similarUserMap).map(async (fid) => {
      const userData = await neynar.fetchCastsForUserData(fid);
      return { userData, summary: similarUserMap[fid].summary };
    });

    const similarUserFeeds = await Promise.all(userFeedPromises);
    const trendingFeeds = await neynar.fetchTrendingFeeds();

    // 6. Generate reply using AI
    const receivedData = await aiService.generateReplyForCast({
      cast,
      similarUserFeeds,
      trendingFeeds,
    });
    if (!receivedData || typeof receivedData === "string") {
      logger.error("Failed to generate reply for cast", {
        castHash: newParentHash,
      });
      return;
    }

    // Fetch user feeds
    let similarUserFeeds;
    try {
      const userFeedPromises = Object.keys(similarUserMap).map(
        async (similarFid) => {
          try {
            const userData = await neynar.fetchCastsForUser(similarFid);
            return { userData, summary: similarUserMap[similarFid].summary };
          } catch (error) {
            logger.error("Error fetching user casts", { error, similarFid, castHash: newParentHash });
            return { userData: null, summary: similarUserMap[similarFid].summary };
          }
        },
      );
      similarUserFeeds = await Promise.all(userFeedPromises);
    } catch (error) {
      logger.error("Error fetching similar user feeds", { error, castHash: newParentHash });
      throw new Error(`Neynar service error fetching user feeds: ${error}`);
    }

    // Fetch trending feeds
    let trendingFeeds;
    try {
      trendingFeeds = await neynar.fetchTrendingFeeds();
      if (!trendingFeeds) {
        logger.warn("Failed to fetch trending feeds, continuing without them", { castHash: newParentHash });
        trendingFeeds = [];
      }
    } catch (error) {
      logger.error("Error fetching trending feeds", { error, castHash: newParentHash });
      // Don't fail the entire process for trending feeds
      trendingFeeds = [];
    }

    // Generate reply
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
      logger.error("Error generating reply", { error, castHash: newParentHash });
      throw new Error(`AI service error generating reply: ${error}`);
    }

    const { needsReply, replyText, embeds } = receivedData;

    if (needsReply.status) {
      const replyDetails: ReplyCast = {
        text: replyText,
        parentHash: newParentHash,
        embeds: embeds,
      };

      // Post reply
      let replyResult;
      try {
        replyResult = await neynar.replyToCast(replyDetails);
        if (!replyResult) {
          logger.error("Failed to reply to cast - Neynar returned null", { castHash: newParentHash });
          return;
        }
      } catch (error) {
        logger.error("Error posting reply", { error, castHash: newParentHash });
        throw new Error(`Neynar service error posting reply: ${error}`);
      }

      await db.addCastReply(newParentHash, replyResult.cast.hash);
      logger.info("Reply posted", {
        castHash: newParentHash,
        replyHash: replyResult.cast.hash,
        confidence: needsReply.confidence,
        processingTimeMs: processingTime
      });
    } else {
      const processingTime = Date.now() - startTime;
      logger.info("No reply needed", {
        castHash: newParentHash,
        reason: needsReply.reason,
        processingTimeMs: processingTime
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
      jobId: job.id
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
