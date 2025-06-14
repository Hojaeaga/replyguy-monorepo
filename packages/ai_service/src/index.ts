import axios from "axios";
import {
  UserSummaryRequest,
  UserSummaryResponse,
  GenerateReplyRequest,
  GenerateEmbeddingResponse,
  GalaxyTrendingResponse,
} from "./types";
import { AIProcessingResponse, Cast } from "@replyguy/core";

const AI_AGENT_BASE_URL = process.env.AI_AGENT_URL || "http://localhost:8001";

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
      return response.data as UserSummaryResponse;
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
  }: GenerateReplyRequest): Promise<AIProcessingResponse> {
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
      return {
        needsReply: {
          status: false,
          confidence: 0,
          reason: "Sorry, I couldn't generate a reply at the moment.",
        },
        replyText: "",
        embeds: {
          url: "",
        },
      };
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
      // @ts-ignore
      return response.data.embedding.vector;
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

      return response.data; // note: response.data is already GalaxyTrendingResponse
    } catch (err: unknown) {
      console.error(
        "getTrendingGalaxyFromCasts error",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  async galaxyTrending(
    casts: Cast[],
    userSummary: UserSummaryResponse,
  ): Promise<GalaxyTrendingResponse | null> {
    try {
      const response = await axios.post<GalaxyTrendingResponse>(
        `${AI_AGENT_BASE_URL}/api/galaxy-trending`,
        {
          casts,
          user_summary: userSummary,
        },
      );
      return response.data;
    } catch (err: unknown) {
      console.error(
        "galaxyTrending error",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }
}
