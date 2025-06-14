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
  const startTime = Date.now();
  let castHash = 'unknown';

  try {
    // Validate job structure
    if (!job || !job.data) {
      throw new Error('Invalid job structure: missing job.data');
    }

    const cast = job.data;
    castHash = cast?.hash || 'unknown';

    // Validate cast data
    if (!cast) {
      throw new Error('Invalid cast data: cast is null or undefined');
    }

    if (!cast.hash) {
      throw new Error('Invalid cast data: missing cast hash');
    }

    if (!cast.author || !cast.author.fid) {
      throw new Error('Invalid cast data: missing author or author.fid');
    }

    if (!cast.text) {
      logger.warn('Cast has no text content', { castHash });
    }

    const parentHash = cast.parent_hash;
    const newParentHash = cast.hash;

    logger.info("Processing cast", {
      castHash: newParentHash,
      authorFid: cast.author.fid,
      hasParent: !!parentHash,
      textLength: cast.text?.length || 0
    });

    // Check if cast already replied to
    try {
      const { data: existingReply } = await db.isCastReplyExists(newParentHash);
      if (existingReply) {
        logger.info("Cast already replied to", { castHash: newParentHash });
        return;
      }
    } catch (error) {
      logger.error("Error checking existing reply", { error, castHash: newParentHash });
      throw new Error(`Database error checking existing reply: ${error}`);
    }

    // Skip if this is a reply to another cast
    if (parentHash) {
      logger.info("Cast is a reply, skipping", { castHash: newParentHash });
      return;
    }

    // Check if user is subscribed
    let isSubscribedResult;
    try {
      isSubscribedResult = await db.isSubscribed(cast.author.fid);
      if (!isSubscribedResult.success) {
        throw new Error(`Failed to check subscription: ${isSubscribedResult.error}`);
      }
    } catch (error) {
      logger.error("Error checking subscription status", { error, castHash: newParentHash, fid: cast.author.fid });
      throw new Error(`Database error checking subscription: ${error}`);
    }

    if (!isSubscribedResult.subscribed) {
      logger.info("User is not subscribed, skipping", {
        castHash: newParentHash,
        fid: cast.author.fid,
      });
      return;
    }

    // Generate embeddings
    let castEmbeddings;
    try {
      castEmbeddings = await aiService.generateEmbeddings(cast.text || '');
      if (!castEmbeddings) {
        logger.error("Failed to generate cast embeddings", {
          castHash: newParentHash,
          textLength: cast.text?.length || 0
        });
        return;
      }
    } catch (error) {
      logger.error("Error generating embeddings", { error, castHash: newParentHash });
      throw new Error(`AI service error generating embeddings: ${error}`);
    }

    // Find similar users
    let similarUsers;
    try {
      const { data: similarUsersData, error: similarityError } = await db.fetchSimilarFIDs(castEmbeddings, 0.4, 3);
      if (similarityError || !similarUsersData) {
        throw new Error(`Error finding similar users: ${similarityError}`);
      }
      similarUsers = similarUsersData;
    } catch (error) {
      logger.error("Error finding similar users", { error, castHash: newParentHash });
      throw new Error(`Database error finding similar users: ${error}`);
    }

    // Build similar user map
    const similarUserMap: any = {};
    for (const user of similarUsers) {
      if (cast.author.fid === user.fid) {
        continue;
      }
      similarUserMap[user.fid] = {
        summary: user.summary,
      };
    }

    logger.info("Found similar users", {
      castHash: newParentHash,
      similarUserCount: Object.keys(similarUserMap).length
    });

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

      // Save reply to database
      try {
        await db.addCastReply(newParentHash, replyResult.cast.hash);
      } catch (error) {
        logger.error("Error saving cast reply to database", { error, castHash: newParentHash, replyHash: replyResult.cast.hash });
        // Don't fail here as the reply was already posted
      }

      const processingTime = Date.now() - startTime;
      logger.info("Reply posted successfully", {
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

