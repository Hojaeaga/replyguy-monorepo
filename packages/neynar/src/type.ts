import { z } from "zod";

// Neynar API CastWithInteractions Types
export const DehydratedUserSchema = z.object({
    object: z.literal('user_dehydrated'),
    fid: z.number(),
    username: z.string(),
    display_name: z.string(),
    pfp_url: z.string(),
    custody_address: z.string(),
});
export type DehydratedUser = z.infer<typeof DehydratedUserSchema>;

export const DehydratedChannelSchema = z.object({
    id: z.string(),
    name: z.string(),
    object: z.literal('channel_dehydrated'),
    image_url: z.string(),
    viewer_context: z.object({
        following: z.boolean(),
        role: z.string(),
    }).optional(),
});
export type DehydratedChannel = z.infer<typeof DehydratedChannelSchema>;

const RangeSchema = z.object({
    start: z.number(),
    end: z.number(),
});

const UserBioSchema = z.object({
    text: z.string(),
    mentioned_profiles: z.array(DehydratedUserSchema).optional(),
    mentioned_profiles_ranges: z.array(RangeSchema).optional(),
    mentioned_channels: z.array(DehydratedChannelSchema).optional(),
    mentioned_channels_ranges: z.array(RangeSchema).optional(),
});

const UserLocationSchema = z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.object({
        city: z.string(),
        state: z.string(),
        state_code: z.string(),
        country: z.string(),
        country_code: z.string(),
    }),
    radius: z.number(),
});

const UserProfileSchema = z.object({
    bio: UserBioSchema,
    location: UserLocationSchema,
});

const VerifiedAddressesSchema = z.object({
    eth_addresses: z.array(z.string()),
    sol_addresses: z.array(z.string()),
    primary: z.object({
        eth_address: z.string().nullable(),
        sol_address: z.string().nullable(),
    }).optional(),
});

const VerifiedAccountSchema = z.object({
    platform: z.string(),
    username: z.string(),
});

const UserObjectViewerContextSchema = z.object({
    following: z.boolean(),
    followed_by: z.boolean(),
    blocking: z.boolean().optional(),
    blocked_by: z.boolean().optional(),
});

export const FullUserSchema = z.object({
    object: z.literal('user'),
    fid: z.number(),
    username: z.string(),
    display_name: z.string(),
    custody_address: z.string(),
    pfp_url: z.string(),
    profile: UserProfileSchema,
    follower_count: z.number(),
    following_count: z.number(),
    verifications: z.array(z.string()),
    verified_addresses: VerifiedAddressesSchema,
    verified_accounts: z.array(VerifiedAccountSchema),
    power_badge: z.boolean(),
    experimental: z.object({
        deprecation_notice: z.string().optional(),
        neynar_user_score: z.number().optional(),
    }).optional(),
    viewer_context: UserObjectViewerContextSchema.optional(),
    score: z.number().optional(),
});
export type FullUser = z.infer<typeof FullUserSchema>;

const EmbedCastIdSchema = z.object({
    fid: z.number(),
    hash: z.string(),
});

export const DehydratedCastSchema = z.object({
    object: z.literal('cast_dehydrated'),
    hash: z.string(),
    author: DehydratedUserSchema,
    app: DehydratedUserSchema,
});
export type DehydratedCast = z.infer<typeof DehydratedCastSchema>;

const BaseEmbeddedCastSchema = z.object({
    hash: z.string(),
    parent_hash: z.string().nullable(),
    parent_url: z.string().nullable(),
    root_parent_url: z.string().nullable(),
    parent_author: z.object({ fid: z.number() }).nullable(),
    author: DehydratedUserSchema,
    app: DehydratedUserSchema,
    text: z.string(),
    timestamp: z.string(),
    channel: DehydratedChannelSchema.optional().nullable(),
});

export const EmbeddedCastSchema: z.ZodType<any> = BaseEmbeddedCastSchema.extend({
    embeds: z.lazy(() => z.array(EmbedSchema)),
});

export type EmbeddedCast = z.infer<typeof EmbeddedCastSchema>;

export const EmbedSchema: z.ZodType<any> = z.lazy(() =>
    z.union([
        z.object({
            cast_id: EmbedCastIdSchema,
            cast: z.union([EmbeddedCastSchema, DehydratedCastSchema]),
        }),
        z.object({ url: z.string() }),
    ]),
);

export type Embed = z.infer<typeof EmbedSchema>;

const FrameButtonSchema = z.object({
    title: z.string(),
    index: z.number(),
    action_type: z.string(),
    target: z.string().optional(),
    post_url: z.string().optional(),
});

const FrameSchema = z.object({
    version: z.string(),
    image: z.string(),
    frames_url: z.string(),
    buttons: z.array(FrameButtonSchema),
    post_url: z.string(),
    title: z.string(),
    image_aspect_ratio: z.string(),
    input: z.object({ text: z.string() }).optional(),
    state: z.object({ serialized: z.string() }).optional(),
});

const ReactionsSchema = z.object({
    likes: z.array(z.object({ fid: z.number(), fname: z.string() })),
    recasts: z.array(z.object({ fid: z.number(), fname: z.string() })),
    likes_count: z.number(),
    recasts_count: z.number(),
});

export const ChannelSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    description: z.string(),
    object: z.literal('channel'),
    created_at: z.number(),
    follower_count: z.number(),
    external_link: z.object({ title: z.string(), url: z.string() }).optional(),
    image_url: z.string(),
    parent_url: z.string(),
    lead: FullUserSchema,
    moderator_fids: z.array(z.number()).optional(),
    member_count: z.number(),
    moderator: FullUserSchema,
    pinned_cast_hash: z.string().nullable(),
    hosts: z.array(FullUserSchema),
    viewer_context: z.object({
        following: z.boolean(),
        role: z.string(),
    }),
    description_mentioned_profiles: z.array(DehydratedUserSchema).optional(),
    description_mentioned_profiles_ranges: z.array(RangeSchema).optional(),
});
export type Channel = z.infer<typeof ChannelSchema>;

export const CastWithInteractionsSchema = z.object({
    object: z.literal('cast'),
    hash: z.string(),
    parent_hash: z.string().nullable(),
    parent_url: z.string().nullable(),
    root_parent_url: z.string().nullable(),
    parent_author: z.object({ fid: z.number() }).nullable(),
    author: FullUserSchema,
    app: DehydratedUserSchema,
    text: z.string(),
    timestamp: z.string(),
    embeds: z.array(EmbedSchema),
    type: z.string(),
    frames: z.array(FrameSchema),
    reactions: ReactionsSchema,
    replies: z.object({ count: z.number() }),
    thread_hash: z.string().nullable(),
    mentioned_profiles: z.array(FullUserSchema),
    mentioned_profiles_ranges: z.array(RangeSchema).optional(),
    mentioned_channels: z.array(DehydratedChannelSchema),
    mentioned_channels_ranges: z.array(RangeSchema).optional(),
    channel: ChannelSchema.optional().nullable(),
    viewer_context: z.object({
        liked: z.boolean(),
        recasted: z.boolean(),
    }).optional(),
    author_channel_context: z.object({
        following: z.boolean(),
        role: z.string(),
    }).optional().nullable(),
});

export type CastWithInteractions = z.infer<typeof CastWithInteractionsSchema>;
