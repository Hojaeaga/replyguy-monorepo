import { AIProcessingResponse, Cast, Embeddings } from '@replyguy/core';

export interface UserData {

}

export interface Feed {
  text: string;
  user_id: string;
  cast_id: string;
  relevance_score: number;
  confidence: number;
}

export interface GenerateReplyRequest {
  cast: Cast,
  cast_summary: string;
  similarUserFeeds: Array<{
    text: string;
    user_id: string;
    cast_id: string;
    relevance_score: number;
    confidence: number;
  }>;
  trendingFeeds: Array<{
    text: string;
    user_id: string;
    cast_id: string;
    relevance_score: number;
    confidence: number;
  }>;
}

export interface GenerateReplyResponse extends AIProcessingResponse {}

export interface GenerateEmbeddingRequest {
  input_data: string;
}

export interface GenerateEmbeddingResponse extends Embeddings {}

export interface UserSummaryRequest {
  user_data: Record<string, unknown>;
}

export interface UserSummaryResponse {
  keywords: string[];
  raw_summary: string;
} 