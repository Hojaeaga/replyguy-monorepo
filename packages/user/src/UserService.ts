import { DBService } from "@replyguy/db";
import { NeynarService } from "@replyguy/neynar";
import { AIService } from "@replyguy/ai_service";
import { checkFIDStatus } from "./utils";
import { FID_STATUS } from "./types";

export class UserService {
  constructor(
    private db: DBService,
    private neynar: NeynarService,
    private aiService: AIService,
  ) {}

  async registerUser(fid: string) {
    const { success, data: alreadySubscribedFIDs } =
      await this.db.fetchSubscribedFIDs();
    if (!success) {
      throw new Error("Failed to fetch subscribed FIDs");
    }

    const alreadySubscribed = await checkFIDStatus(Number(fid), this.db);
    if (!alreadySubscribed.success) {
      throw new Error("Failed to check FID status");
    }

    // Handle already subscribed user
    if (alreadySubscribed.status === FID_STATUS.SUBSCRIBED) {
      return { success: true, data: `User ${fid} already subscribed` };
    }

    // Handle existing but not subscribed user
    if (alreadySubscribed.status === FID_STATUS.EXIST) {
      return await this.subscribeExistingUser(fid, alreadySubscribedFIDs);
    }

    // Handle new user registration
    return await this.registerNewUser(fid, alreadySubscribedFIDs);
  }

  private async subscribeExistingUser(
    fid: string,
    alreadySubscribedFIDs: string[],
  ) {
    const newSubscribedUserIds = [...alreadySubscribedFIDs, fid];
    await this.neynar.updateWebhook({
      updatedFids: newSubscribedUserIds,
    });

    const { success } = await this.db.onlySubscribeFID(fid);
    if (!success) {
      throw new Error("User subscription failed");
    }

    return { success: true, data: `User ${fid} subscribed` };
  }

  private async registerNewUser(fid: string, alreadySubscribedFIDs: string[]) {
    const userData = await this.neynar.aggregateUserData(fid);
    const userContext = await this.aiService.summarizeUserContext(userData);

    if (!userContext) throw new Error("Failed to summarize user context");

    const {
      user_summary: { raw_summary, keywords },
      user_embeddings: { vector: embeddings },
    } = userContext;

    // Insert raw summary
    const profileExists = await this.db.checkIfUserProfileExists(fid);
    if (!profileExists) {
      const result = await this.db.insertUserProfile(fid, raw_summary);
      if (!result.success)
        console.warn("Failed to insert profile", result.error);
    }

    // Insert keywords
    const keywordsExist = await this.db.checkIfUserKeywordsExist(fid);
    if (!keywordsExist) {
      const result = await this.db.insertUserKeywords(fid, keywords);
      if (!result.success)
        console.warn("Failed to insert keywords", result.error);
    }

    // Insert user embeddings
    const embeddingExists = await this.db.checkIfUserEmbeddingExists(fid);
    if (!embeddingExists) {
      const result = await this.db.insertUserEmbedding(fid, embeddings);
      if (!result.success)
        console.warn("Failed to insert embedding", result.error);
    }

    // Insert edges (we assume similarity edges can be updated every time)
    const edgeResult = await this.db.insertUserSimilarityEdges(fid, embeddings);
    if (!edgeResult.success)
      console.warn("Failed to insert similarity edges", edgeResult.error);

    // Register in main embedding table (idempotent insert)
    const alreadyRegistered = await this.db.isRegistered(Number(fid));
    if (!alreadyRegistered.registered) {
      const regResult = await this.db.registerAndSubscribeFID(
        fid,
        keywords,
        embeddings,
      );
      if (!regResult.success) throw new Error("User registration failed");
    }

    // Update webhook
    const newSubscribedUserIds = [...alreadySubscribedFIDs, fid];
    await this.neynar.updateWebhook({ updatedFids: newSubscribedUserIds });

    return { success: true, data: `User ${fid} subscribed` };
  }

  async registerReqForTrending(fid: string) {
    const alreadySubscribed = await checkFIDStatus(Number(fid), this.db);
    if (!alreadySubscribed.success) {
      throw new Error("Failed to check FID status");
    }

    if (alreadySubscribed.status !== FID_STATUS.SUBSCRIBED) {
      return {
        success: false,
        data: `User ${fid} is  not subscribed returning`,
      };
    }

    const userSummary = await this.aiService.summarizeUserContext({
      fid: Number(fid),
    });
    if (!userSummary) {
      throw new Error("Failed to summarize user context");
    }
    const trendingResult = await this.neynar.fetchTrendingPostsWithLimit(30);

    if (!trendingResult.success) {
      throw new Error(trendingResult.error || "Trending fetch failed");
    }

    const trendingCasts = trendingResult.data; // now 30 posts

    if (trendingCasts.length === 0) {
      return { success: false, data: "No trending posts found" };
    }
    const galaxyTrending = await this.aiService.galaxyTrending(
      trendingCasts,
      userSummary,
    );
    if (!galaxyTrending) {
      throw new Error("Failed to get galaxy trending");
    }
    return {
      success: true,
      data: galaxyTrending,
    };
  }
}
