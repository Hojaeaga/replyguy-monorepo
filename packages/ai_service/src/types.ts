import { AIProcessingResponse, Cast, Embeddings } from "@replyguy/core";

export interface UserData {}

export interface Feed {
  author: string;
  fid: number;
  hash: string;
  text: string;
  timestamp: string;
  channel: string | null;
  embedUrls: string[];
  frame: {
    title: string;
    buttons: string[];
  } | null;
  likes: number;
  recasts: number;
  frames: Array<{
    title: string;
    buttons: string[];
  }>;
}

export interface GenerateReplyRequest {
  cast: Cast;
  similarUserFeeds: Array<{
    userData: Array<Feed>;
    summary: string;
  }>;
  trendingFeeds: Array<Feed>;
}

export interface GenerateReplyResponse extends AIProcessingResponse {}

export interface GenerateEmbeddingRequest {
  input_data: string;
}

export interface GenerateEmbeddingResponse extends Embeddings {}

export interface UserSummaryRequest {
  user_data: Record<string, unknown>;
}

export type TopicCluster = {
  topic: string;
  casts: {
    hash: string;
    text: string;
    author: {
      fid: number;
      username: string;
      displayName?: string;
    };
    timestamp: string;
    likes?: number;
    replies?: number;
    recasts?: number;
  }[];
};

export type GalaxyTrendingResponse = TopicCluster[];
export interface UserSummaryResponse {
  user_summary: {
    keywords: string[];
    raw_summary: string;
  };
  user_embeddings: {
    vector: number[];
    dimensions: number;
  };
}
