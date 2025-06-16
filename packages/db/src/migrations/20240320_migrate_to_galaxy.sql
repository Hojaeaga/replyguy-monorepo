-- Migration to move data from user_embeddings to new Galaxy system tables
-- This migration should be run after the new tables are created

-- First, migrate user profiles
INSERT INTO new_users (fid, raw_summary, created_at)
SELECT 
    fid::text,
    summary,
    last_updated
FROM user_embeddings
WHERE summary IS NOT NULL
ON CONFLICT (fid) DO NOTHING;

-- Migrate user embeddings
INSERT INTO new_user_embeddings (fid, embedding, dimensions, source_text, created_at)
SELECT 
    fid::text,
    embeddings,
    vector_dims(embeddings) AS dimensions, -- Use vector_dims to get the dimensions
    summary, -- Use summary as source text
    last_updated
FROM user_embeddings
WHERE embeddings IS NOT NULL
ON CONFLICT (fid) DO NOTHING;

-- Extract keywords from metadata and insert into new_user_keywords
-- Assuming metadata contains a 'keywords' array field
INSERT INTO new_user_keywords (fid, topic, weight)
SELECT 
    fid::text,
    keyword,
    1.0 as weight -- Default weight, can be updated later
FROM user_embeddings,
     jsonb_array_elements_text(metadata->'keywords') as keyword
WHERE metadata->'keywords' IS NOT NULL
ON CONFLICT (fid, topic) DO NOTHING;

-- Create similarity edges for all users
-- This will compute similarity between all users based on their embeddings
WITH user_pairs AS (
    SELECT 
        a.fid as fid_a,
        b.fid as fid_b,
        (a.embeddings <=> b.embeddings) as similarity
    FROM user_embeddings a
    CROSS JOIN user_embeddings b
    WHERE a.fid < b.fid -- Avoid duplicate pairs
    AND a.embeddings IS NOT NULL 
    AND b.embeddings IS NOT NULL
    AND (a.embeddings <=> b.embeddings) < 0.8 -- Only keep similar pairs (threshold can be adjusted)
)
INSERT INTO new_user_similarity_edges (fid_a, fid_b, similarity, computed_at)
SELECT 
    fid_a::text,
    fid_b::text,
    1 - similarity as similarity, -- Convert distance to similarity
    NOW()
FROM user_pairs
ON CONFLICT (fid_a, fid_b) DO NOTHING;

-- Create feed matches for subscribed users
-- This will create initial feed matches based on user embeddings
WITH subscribed_users AS (
    SELECT fid, embeddings
    FROM user_embeddings
    WHERE is_subscribed = true
    AND embeddings IS NOT NULL
),
trending_casts AS (
    SELECT hash, embedding
    FROM new_casts c
    JOIN new_cast_embeddings ce ON c.hash = ce.hash
    WHERE c.created_at > NOW() - INTERVAL '7 days'
    ORDER BY c.engagement DESC
    LIMIT 100
)
INSERT INTO new_user_feed_matches (fid, hash, match_score, reason, created_at)
SELECT 
    u.fid::text,
    c.hash,
    1 - (u.embeddings <=> c.embedding) as match_score,
    'Initial migration match' as reason,
    NOW()
FROM subscribed_users u
CROSS JOIN trending_casts c
WHERE 1 - (u.embeddings <=> c.embedding) > 0.4 -- Only keep good matches
ON CONFLICT (fid, hash) DO NOTHING;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_new_user_embeddings_embedding ON new_user_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_new_cast_embeddings_embedding ON new_cast_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_new_user_feed_matches_fid ON new_user_feed_matches (fid);
CREATE INDEX IF NOT EXISTS idx_new_user_feed_matches_match_score ON new_user_feed_matches (match_score DESC);
CREATE INDEX IF NOT EXISTS idx_new_user_similarity_edges_fid_a ON new_user_similarity_edges (fid_a);
CREATE INDEX IF NOT EXISTS idx_new_user_similarity_edges_fid_b ON new_user_similarity_edges (fid_b);