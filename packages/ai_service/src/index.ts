import axios from "axios";
import {
  UserSummaryRequest,
  UserSummaryResponse,
  GenerateReplyRequest,
  GenerateEmbeddingResponse,
  GalaxyTrendingResponse,
} from "./types";
import { AIProcessingResponse, Cast } from "@replyguy/core";

const AI_AGENT_BASE_URL = process.env.AI_AGENT_URL || "http://localhost:8000";

export class AIService {
  constructor() {}

  async summarizeUserContext(
    userData: UserSummaryRequest["user_data"],
  ): Promise<UserSummaryResponse | null> {
    try {
      const response = await axios.post<UserSummaryResponse>(
        `${AI_AGENT_BASE_URL}/api/user-summary`,
        {
          user_data: userData,
        },
      );
      return response.data;
    } catch (err: unknown) {
      console.error(
        "summarizeUserContext error",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async generateReplyForCast({
    cast,
    similarUserFeeds,
    trendingFeeds,
  }: GenerateReplyRequest): Promise<AIProcessingResponse | string> {
    try {
      const response = await axios.post(
        `${AI_AGENT_BASE_URL}/api/generate-reply`,
        {
          cast,
          similarUserFeeds,
          trendingFeeds,
        },
      );

      const data = response.data;

      const result: AIProcessingResponse = {
        needsReply: {
          status: data.intent_analysis.should_reply,
          confidence: data.intent_analysis.confidence,
          reason: data.intent_analysis.identified_needs?.[0] ?? "",
        },
        replyText: data.reply.reply_text,
        embeds: data.reply.link,
      };

      return result;
    } catch (err: unknown) {
      console.error(
        "generateReplyForCast error",
        err instanceof Error ? err.message : err,
      );
      return "Sorry, I couldn't generate a reply at the moment.";
    }
  }

  async generateEmbeddings(text: string): Promise<number[] | null> {
    try {
      const response = await axios.post<GenerateEmbeddingResponse>(
        `${AI_AGENT_BASE_URL}/api/generate-embedding`,
        {
          input_data: text,
        },
      );
      return response.data.embeddings;
    } catch (err: unknown) {
      console.error(
        "generateEmbeddings error",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async getTrendingGalaxyFromCasts(
    casts: Cast[],
  ): Promise<GalaxyTrendingResponse | null> {
    try {
      const response = await axios.post<GalaxyTrendingResponse>(
        `${AI_AGENT_BASE_URL}/api/galaxy-trending`,
        {
          casts,
        },
      );

      return response.data.data; // note: wrapping response has { status, data }
    } catch (err: unknown) {
      console.error(
        "getTrendingGalaxyFromCasts error",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }
}
