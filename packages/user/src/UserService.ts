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
    const summary = await this.aiService.summarizeUserContext(userData);
    if (!summary) {
      throw new Error("Summary generation failed");
    }

    const embeddings = await this.aiService.generateEmbeddings(summary);
    if (!embeddings) {
      throw new Error("Embedding generation failed");
    }

    const { success } = await this.db.registerAndSubscribeFID(
      fid,
      summary,
      embeddings,
    );
    if (!success) {
      throw new Error("User registration failed");
    }

    const newSubscribedUserIds = [...alreadySubscribedFIDs, fid];
    await this.neynar.updateWebhook({
      updatedFids: newSubscribedUserIds,
    });

    return { success: true, data: `User ${fid} subscribed` };
  }
}

