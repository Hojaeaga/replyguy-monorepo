import axios from "axios";
import {
  UserSummaryRequest,
  UserSummaryResponse,
  GenerateReplyRequest,
  GenerateReplyResponse,
  GenerateEmbeddingResponse,
} from "./types";

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
    cast_summary,
    similarUserFeeds,
    trendingFeeds,
  }: GenerateReplyRequest): Promise<GenerateReplyResponse | string> {
    try {
      const response = await axios.post<GenerateReplyResponse>(
        `${AI_AGENT_BASE_URL}/api/generate-reply`,
        {
          cast,
          cast_summary,
          similarUserFeeds,
          trendingFeeds,
        },
      );
      return response.data;
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
}

