import axios from "axios";
import { CastWithInteractions } from "./type";
import { ReplyCast, ReplyCastResponse } from "@replyguy/core";

export class NeynarService {
  NEYNAR_BASE_URL = "https://api.neynar.com/v2/farcaster";
  constructor(
    private neynarApiKey: string,
    private signerUuid: string,
    private webhookId: string,
    private webhookUrl: string,
  ) { }

  private getHeaders() {
    return {
      "x-api-key": this.neynarApiKey,
      "Content-Type": "application/json",
    };
  }

  async fetchSubscribedUsers(): Promise<string[]> {
    try {
      const res = await axios.get(
        `${this.NEYNAR_BASE_URL}/webhook?webhook_id=01JTB3W4GW48Z58X0HQAM587AJ`,
        { headers: this.getHeaders() },
      );

      const targetWebhook = res.data.webhook;

      if (!targetWebhook) {
        console.warn("Webhook with ID not found.");
        return [];
      }

      let authorFids =
        targetWebhook.subscription?.filters["cast.created"]?.author_fids;
      if (!authorFids) {
        authorFids = [];
      }
      return authorFids;
    } catch (err) {
      console.error("fetchWebhook error", err);
      return [];
    }
  }

  async updateWebhook({ updatedFids }: { updatedFids: string[] }) {
    try {
      const numericFids = updatedFids
        .filter((fid) => typeof fid === "number" || !Number.isNaN(Number(fid)))
        .map((fid) => Number(fid));
      const res = await axios.put(
        `${this.NEYNAR_BASE_URL}/webhook`,
        {
          webhook_id: this.webhookId,
          name: "receiveCast",
          url: this.webhookUrl,
          subscription: {
            "cast.created": {
              author_fids: numericFids,
            },
          },
        },
        { headers: this.getHeaders() },
      );
      return res.data;
    } catch (err) {
      console.error("updateWebhook error", err);
      return null;
    }
  }
  async writeCast(text: string) {
    try {
      const res = await axios.post(
        `${this.NEYNAR_BASE_URL}/cast`,
        {
          signer_uuid: this.signerUuid,
          text,
        },
        { headers: this.getHeaders() },
      );
      return res.data;
    } catch (err) {
      console.error("writeCast error", err);
      return null;
    }
  }

  async replyToCast(
    replyDetails: ReplyCast,
  ): Promise<ReplyCastResponse | null> {
    try {
      const res = await axios.post(
        `${this.NEYNAR_BASE_URL}/cast`,
        {
          signer_uuid: this.signerUuid,
          text: replyDetails.text,
          parent: replyDetails.parentHash,
          embeds: replyDetails.embeds,
        },
        { headers: this.getHeaders() },
      );
      return res.data;
    } catch (err) {
      console.error("replyToCast error", err);
      return null;
    }
  }

  async fetchUserRepliesAndRecasts(fid: string) {
    try {
      const res = await axios.get(
        `${this.NEYNAR_BASE_URL}/feed/user/replies_and_recasts`,
        {
          params: { fid },
          headers: this.getHeaders(),
        },
      );
      const allCasts = res.data.casts;
      // Filter: meaningful replies or recasts with content
      const meaningfulCasts = allCasts.filter((cast: any) => {
        const text = cast.text?.trim();
        const hasText = !!text && text.length > 0;
        const hasMedia = cast.embeds?.length > 0 || cast.mentions?.length > 0;
        const isReply = cast.parent_hash !== null;
        const isRecast = cast.recasted_cast !== undefined;

        // Filter for thoughtful replies or recasts with context
        return (isReply || isRecast) && (hasText || hasMedia);
      });

      const top10 = meaningfulCasts.slice(0, 10);

      return top10;
    } catch (err) {
      console.error("fetchUserRepliesAndRecasts error", err);
      return null;
    }
  }

  async fetchUserPopularCasts(fid: string) {
    const publicOptions = {
      method: "GET", // or POST
    };

    const privateOptions = {
      headers: {
        "x-api-key": this.neynarApiKey,
        "Content-Type": "application/json",
      },
    };

    const url = `${this.NEYNAR_BASE_URL}/feed/user/popular?fid=${fid}`;

    let receivedData: any;
    let ipfsHash: any;

    try {
      const response = await axios.get(url, {
        method: "GET",
        headers: {
          "x-api-key": this.neynarApiKey,
          "Content-Type": "application/json",
        },
      });
      receivedData = response.data;
    } catch (err) {
      console.error("fetchUserPopularCasts error", err);
      return null;
    }

    const simplifiedCasts = receivedData.casts.map((cast: any) => ({
      fid: cast.author.fid,
      name: cast.author.username,
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp,
      channel: cast.channel?.name || null,
      embedUrls: cast.embeds?.map((e: any) => e.url) || [],
      frame: cast.frames?.length
        ? {
          title: cast.frames[0].title,
          buttons: cast.frames[0].buttons?.map((b: any) => b.title) || [],
        }
        : null,
      likes: cast.reactions?.likes_count || 0,
      recasts: cast.reactions?.recasts_count || 0,
    }));

    return simplifiedCasts;
  }

  async fetchUserChannels(fid: string) {
    try {
      const res = await axios.get(`${this.NEYNAR_BASE_URL}/user/channels`, {
        params: { fid },
        headers: this.getHeaders(),
      });

      const simplifiedChannels = res.data.channels.map((channel: any) => {
        const lead = channel.lead || {};
        const bio = lead.profile?.bio?.text || "";
        const locationObj = lead.profile?.location?.address;
        const location = locationObj
          ? `${locationObj.city || ""}, ${locationObj.country || ""}`
          : null;

        return {
          id: channel.id,
          name: channel.name,
          description: channel.description,
          follower_count: channel.follower_count,
          member_count: channel.member_count,
          url: channel.url,
          external_link: channel.external_link || null,
          image_url: channel.image_url,
          lead: {
            fid: lead.fid,
            username: lead.username,
            display_name: lead.display_name,
            bio,
            location,
            follower_count: lead.follower_count,
            verified_accounts:
              lead.verified_accounts?.map((acc: any) => acc.username) || [],
          },
        };
      });

      return simplifiedChannels;
    } catch (err) {
      console.error("fetchUserChannels error", err);
      return null;
    }
  }

  async fetchTrendingFeeds() {
    try {
      const res = await axios.get(
        `${this.NEYNAR_BASE_URL}/feed/trending?limit=10`,
        {
          headers: this.getHeaders(),
        },
      );

      const simplifiedCasts = res.data.casts.map((cast: any) => ({
        hash: cast.hash,
        text: cast.text,
        username: cast.author.username,
        timestamp: cast.timestamp,
        channel: cast.channel?.name || null,
        embedUrls: cast.embeds?.map((e: any) => e.url) || [],
        frame: cast.frames?.length
          ? {
            title: cast.frames[0].title,
            buttons: cast.frames[0].buttons?.map((b: any) => b.title) || [],
          }
          : null,
        likes: cast.reactions?.likes_count || 0,
        recasts: cast.reactions?.recasts_count || 0,
      }));

      return simplifiedCasts;
    } catch (err) {
      console.error("fetchTrendingFeeds error", err);
      return null;
    }
  }

  async fetchUserFeeds(fid: string) {
    try {
      const res = await axios.get(`${this.NEYNAR_BASE_URL}/feed/user`, {
        params: { fid },
        headers: this.getHeaders(),
      });
      const simplifiedCasts = res.data.casts.map((cast: any) => ({
        hash: cast.hash,
        text: cast.text,
        timestamp: cast.timestamp,
        channel: cast.channel?.name || null,
        embedUrls: cast.embeds?.map((e: any) => e.url) || [],
        frame: cast.frames?.length
          ? {
            title: cast.frames[0].title,
            buttons: cast.frames[0].buttons?.map((b: any) => b.title) || [],
          }
          : null,
        likes: cast.reactions?.likes_count || 0,
        recasts: cast.reactions?.recasts_count || 0,
        frames:
          cast.frames?.map((f: any) => ({
            title: f.title,
            buttons: f.buttons?.map((b: any) => b.title) || [],
          })) || [],
      }));
      return simplifiedCasts;
    } catch (err) {
      console.error("fetchUserFeeds error", err);
      return null;
    }
  }
  async fetchCastsForUser(fid: string) {
    const url = `${this.NEYNAR_BASE_URL}/feed/user/casts?fid=${fid}&limit=100`;

    let data;
    try {
      const res = await axios.get(url, {
        method: "GET",
        headers: {
          "x-api-key": this.neynarApiKey,
          "Content-Type": "application/json",
        },
      });
      data = res.data;
      console.log("data", data);
    } catch (err) {
      console.error("fetchCastsForUser error", err);
    }

    const simplifiedCasts = data.casts.map((cast: CastWithInteractions) => ({
      author: cast.author.username,
      fid: cast.author.fid,
      hash: cast.hash,
      text: cast.text,
      timestamp: cast.timestamp,
      channel: cast.channel?.name || null,
      embedUrls: cast.embeds?.map((e: any) => e.url) || [],
      frame: cast.frames?.length
        ? {
          title: cast.frames[0].title,
          buttons: cast.frames[0].buttons?.map((b: any) => b.title) || [],
        }
        : null,
      likes: cast.reactions?.likes_count || 0,
      recasts: cast.reactions?.recasts_count || 0,
      frames:
        cast.frames?.map((f: any) => ({
          title: f.title,
          buttons: f.buttons?.map((b: any) => b.title) || [],
        })) || [],
    }));

    return simplifiedCasts;
  }

  async aggregateUserData(fid: string) {
    const [popularCasts, channels, casts] = await Promise.all([
      this.fetchUserPopularCasts(fid),
      this.fetchUserChannels(fid),
      this.fetchCastsForUser(fid),
    ]);

    return {
      popularCasts,
      channels,
      casts,
    };
  }

  async fetchTrendingPosts(limit = 10, cursor?: string) {
    try {
      const url = new URL(`${this.NEYNAR_BASE_URL}/feed/trending/`);
      url.searchParams.set("limit", limit.toString());
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Trending fetch failed: ${res.statusText}`);
      }

      const json = await res.json() as any;
      return {
        success: true,
        data: json.casts, // trending posts
        cursor: json.cursor, // for pagination
      };
    } catch (err: any) {
      console.error("fetchTrendingPosts error:", err);
      return { success: false, error: err.message || err };
    }
  }

  async fetchTrendingPostsWithLimit(
    targetLimit = 30,
  ): Promise<{ success: boolean; data: any[]; error?: string }> {
    let allCasts: any[] = [];
    let cursor: string | undefined = undefined;

    try {
      while (allCasts.length < targetLimit) {
        const response = await this.fetchTrendingPosts(10, cursor); // use your existing method

        if (!response.success) {
          return { success: false, data: [], error: response.error };
        }

        allCasts = [...allCasts, ...response.data];
        cursor = response.cursor;

        if (!cursor || response.data.length === 0) break; // No more results
      }

      return { success: true, data: allCasts.slice(0, targetLimit) };
    } catch (err: any) {
      return { success: false, data: [], error: err.message || String(err) };
    }
  }
}
