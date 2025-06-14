import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export class DBService {
  supabase: SupabaseClient;
  constructor(SUPABASE_URL: string, SUPABASE_ANON_KEY: string) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async fetchSubscriberCount() {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("fid")
        .eq("is_subscribed", true);
      if (error) throw error;
      return { success: true, data: data.length };
    } catch (err: any) {
      console.error("fetchSubscriberCount error", err);
      return { success: false, error: err.message || err, data: 0 };
    }
  }

  async getUser(fid: number) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("*")
        .eq("fid", fid);
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("getUser error", err);
      return { success: false, error: err.message || err };
    }
  }

  async isSubscribed(fid: number) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("fid")
        .eq("fid", fid)
        .eq("is_subscribed", true)
        .maybeSingle();
      if (error) throw error;
      return { success: true, subscribed: !!data };
    } catch (err: any) {
      console.error("checkSubscribedUser error", err);
      return { success: false, error: err.message || err };
    }
  }

  async unsubscribeFID(fid: number) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .update({ is_subscribed: false, is_unsubscribed: true })
        .eq("fid", fid);
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("unsubscribeFID error", err);
      return { success: false, error: err.message || err };
    }
  }

  async isRegistered(fid: number) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("fid")
        .eq("fid", fid)
        .maybeSingle();
      if (error) throw error;
      return { success: true, registered: !!data };
    } catch (err: any) {
      console.error("isRegistered error", err);
      return { success: false, error: err.message || err };
    }
  }

  async registerAndSubscribeFID(fid: string, summary: any, embeddings: any) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .insert({
          fid,
          summary,
          embeddings,
          is_subscribed: true,
        });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("registerUser error", err);
      return { success: false, error: err.message || err };
    }
  }

  async onlySubscribeFID(fid: string) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .update({ is_subscribed: true })
        .eq("fid", fid);
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("onlySubscribeFID error", err);
      return { success: false, error: err.message || err };
    }
  }

  async onlyRegisterFID(fid: string, summary: any, embeddings: any) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .insert({
          fid,
          summary,
          embeddings,
          is_subscribed: false,
        });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("registerUser error", err);
      return { success: false, error: err.message || err };
    }
  }

  async fetchSubscribedFIDs() {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("fid")
        .eq("is_subscribed", true);
      if (error) throw error;
      const fids = data.map((user: any) => user.fid);
      return { success: true, data: fids };
    } catch (err: any) {
      console.error("fetchSubscribedFIDs error", err);
      return { success: false, error: err.message || err, data: [] };
    }
  }

  async checkFIDStatus(fid: number) {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("fid, is_subscribed")
        .eq("fid", fid)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("checkFIDStatus error", err);
      return { success: false, error: err.message || err };
    }
  }

  async fetchAllFIDs() {
    try {
      const { data, error } = await this.supabase
        .from("user_embeddings")
        .select("*");
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("fetchAllFIDs error", err);
      return { success: false, error: err.message || err };
    }
  }

  async fetchSimilarFIDs(
    cast_embeddings: any,
    match_threshold: number,
    match_count: number,
  ) {
    try {
      const { data, error } = await this.supabase.rpc(
        "match_users_by_embedding",
        { query_embedding: cast_embeddings, match_threshold, match_count },
      );
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("fetchSimilarFIDs error", err);
      return { success: false, error: err.message || err };
    }
  }

  async addCastReply(cast_hash: string, cast_reply_hash: string) {
    try {
      const { data, error } = await this.supabase
        .from("cast_replies")
        .insert({ cast_hash, cast_reply_hash });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("addCastReply error", err);
      return { success: false, error: err.message || err };
    }
  }

  async isCastReplyExists(cast_hash: string) {
    try {
      const { data, error } = await this.supabase
        .from("cast_replies")
        .select("cast_hash")
        .eq("cast_hash", cast_hash)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("isCastReplyExists error", err);
      return { success: false, error: err.message || err };
    }
  }

  async insertUserProfile(fid: string, summary: string) {
    try {
      const { data, error } = await this.supabase
        .from("new_users")
        .insert({ fid, summary });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("insertUserProfile error", err);
      return { success: false, error: err.message || err };
    }
  }

  async insertUserKeywords(fid: string, keywords: string[]) {
    const keywordRows = keywords.map((k) => ({ fid, keyword: k }));
    try {
      const { data, error } = await this.supabase
        .from("new_user_keywords")
        .insert(keywordRows);
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("insertUserKeywords error", err);
      return { success: false, error: err.message || err };
    }
  }

  async insertUserEmbedding(fid: string, embedding: number[]) {
    try {
      const { data, error } = await this.supabase
        .from("new_user_embeddings")
        .insert({ fid, embedding });
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("insertUserEmbedding error", err);
      return { success: false, error: err.message || err };
    }
  }

  async insertUserSimilarityEdges(
    fid: string,
    embedding: number[],
    threshold: number = 0.8,
    topK: number = 10,
  ) {
    try {
      const { data: matches, error } = await this.supabase.rpc(
        "match_users_by_embedding",
        {
          query_embedding: embedding,
          match_threshold: threshold,
          match_count: topK,
        },
      );
      if (error) throw error;

      const edges = matches
        .filter((m: any) => m.fid !== fid)
        .flatMap((m: any) => [
          {
            fid_1: fid,
            fid_2: m.fid,
            similarity: m.similarity,
          },
          {
            fid_1: m.fid,
            fid_2: fid,
            similarity: m.similarity,
          },
        ]);

      if (edges.length === 0) return { success: true, data: [] };

      const { data, error: insertError } = await this.supabase
        .from("new_user_similarity_edges")
        .insert(edges);

      if (insertError) throw insertError;

      return { success: true, data };
    } catch (err: any) {
      console.error("insertUserSimilarityEdges error", err);
      return { success: false, error: err.message || err };
    }
  }

  async checkIfUserProfileExists(fid: string) {
    const { data } = await this.supabase
      .from("new_user_profiles")
      .select("fid")
      .eq("fid", fid)
      .maybeSingle();
    return !!data;
  }

  async checkIfUserKeywordsExist(fid: string) {
    const { data } = await this.supabase
      .from("new_user_keywords")
      .select("fid")
      .eq("fid", fid)
      .maybeSingle();
    return !!data;
  }

  async checkIfUserEmbeddingExists(fid: string) {
    const { data } = await this.supabase
      .from("new_user_embeddings")
      .select("fid")
      .eq("fid", fid)
      .maybeSingle();
    return !!data;
  }

  async getSimilarUsers(fid: number, limit = 10) {
    const { data, error } = await this.supabase
      .from("new_user_edges")
      .select("target_fid, score")
      .eq("source_fid", fid)
      .order("score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async fetchSimilarUsersToCast(
    castEmbedding: number[],
    threshold = 0.4,
    topK = 5,
  ) {
    const { data, error } = await this.supabase.rpc(
      "match_users_by_embedding",
      {
        query_embedding: castEmbedding,
        match_threshold: threshold,
        match_count: topK,
      },
    );

    if (error) throw error;
    return data;
  }

  async updateUserSimilarityFromCast(
    sourceFid: number,
    matchedUsers: { fid: number; similarity: number }[],
  ) {
    const edges = matchedUsers
      .filter((m) => m.fid !== sourceFid)
      .map((m) => ({
        fid_1: sourceFid,
        fid_2: m.fid,
        similarity: m.similarity, // or combine with existing edge and average it
      }));

    if (edges.length === 0) return;

    await this.supabase.from("new_user_similarity_edges").upsert(edges);
  }
}
