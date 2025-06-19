import { Neynar} from "@replyguy/neynar"
import { DBService } from '@replyguy/db';
import axios from 'axios';

export class UserAnalysisService {
  constructor(
    private neynar: Neynar,
    private db: DBService,
    private aiAgentUrl: string
  ) {}

  async analyzeUser(fid: string) {
    try {
      // 1. Fetch user data from Neynar
      const user = await this.neynar.lookupUserByFid(Number(fid));
      const casts = await this.neynar.getUserCasts(Number(fid), { limit: 10 });
      const channels = await this.neynar.getUserChannels(Number(fid));

      // 2. Prepare data for AI agent
      const userData = {
        fid: Number(fid),
        bio: user.profile.bio,
        casts: casts.casts.map(cast => cast.text),
        following_count: user.following_count,
        follower_count: user.follower_count,
        channels: channels.channels.map(channel => channel.name),
        connected_address: user.connected_address
      };

      // 3. Call AI agent workflow
      const response = await axios.post(`${this.aiAgentUrl}/analyze`, userData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to analyze user');
      }

      const { summary, keywords, embedding, similar_users } = response.data.data;

      // 4. Store results in database
      await this.db.storeUserAnalysis({
        fid: Number(fid),
        summary,
        embedding,
        keywords
      });

      // 5. Store similarity edges
      for (const similarUser of similar_users) {
        await this.db.storeUserSimilarity({
          fid_1: Number(fid),
          fid_2: similarUser.fid,
          similarity: similarUser.similarity
        });
      }

      return {
        success: true,
        data: {
          summary,
          keywords,
          similar_users
        }
      };

    } catch (error) {
      console.error('Error in user analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 