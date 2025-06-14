import { config } from "dotenv";
import { logger, ReplyCast } from "@replyguy/core";
import QueueService from "@replyguy/queue";
import { NeynarService } from "@replyguy/neynar";
import { AIService } from "@replyguy/ai_service";
import { DBService } from "@replyguy/db";

// Load environment variables
config();

// Initialize clients
const queue = new QueueService({
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
});

const neynar = new NeynarService(
  process.env.NEYNAR_API_KEY!,
  process.env.NEYNAR_SIGNER_UUID!,
  process.env.NEYNAR_WEBHOOK_ID!,
  process.env.NEYNAR_WEBHOOK_URL!,
);

const db = new DBService(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const aiService = new AIService();

// Worker job processor
async function processCast(job: any) {
  const cast = job.data;
  const parentHash = cast.parent_hash;
  const newParentHash = cast.hash;
  logger.info("Processing cast", { castHash: newParentHash });

  const { data: existingReply } = await db.isCastReplyExists(newParentHash);

  if (existingReply) {
    logger.info("Cast already replied to", { castHash: newParentHash });
    return;
  }

  if (parentHash) {
    logger.info("Cast is a reply, skipping", { castHash: newParentHash });
    return;
  }

  const isSubscribed = await db.isSubscribed(cast.author.fid);

  if (!isSubscribed) {
    logger.info("User is not subscribed, skipping", {
      castHash: newParentHash,
      fid: cast.author.fid,
    });
    return;
  }

  try {
    const castEmbeddings = await aiService.generateEmbeddings(cast.text);
    if (!castEmbeddings) {
      logger.error("Failed to generate cast embeddings", {
        castHash: newParentHash,
      });
      return;
    }
    const { data: similarUsers, error: similarityError } =
      await db.fetchSimilarFIDs(castEmbeddings, 0.4, 3);
    if (similarityError || !similarUsers) {
      throw new Error("Error finding similar users");
    }

    const similarUserMap: any = {};
    for (const user of similarUsers) {
      if (cast.author.fid === user.fid) {
        continue;
      }
      similarUserMap[user.fid] = {
        summary: user.summary,
      };
    }

    const userFeedPromises = Object.keys(similarUserMap).map(
      async (similarFid) => {
        const userData =
          await neynar.fetchCastsForUser(similarFid);
        return { userData, summary: similarUserMap[similarFid].summary };
      },
    );
    const similarUserFeeds = await Promise.all(userFeedPromises);
    const trendingFeeds = await neynar.fetchTrendingFeeds();

    const receivedData = await aiService.generateReplyForCast({
      cast,
      similarUserFeeds,
      trendingFeeds,
    });

    const { needsReply, replyText, embeds } = receivedData;

    if (needsReply.status) {
      const replyDetails: ReplyCast = {
        text: replyText,
        parentHash: newParentHash,
        embeds: embeds,
      };

      const replyResult = await neynar.replyToCast(replyDetails);

      if (!replyResult) {
        logger.error("Failed to reply to cast", { castHash: newParentHash });
        return;
      }

      await db.addCastReply(newParentHash, replyResult.cast.hash);

      logger.info("Reply posted", {
        castHash: newParentHash,
        replyHash: replyResult.cast.hash,
        confidence: needsReply.confidence,
      });
    } else {
      logger.info("No reply needed", {
        castHash: newParentHash,
        reason: needsReply.reason,
      });
    }
  } catch (error) {
    logger.error("Error processing cast", { error, castHash: newParentHash });
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

