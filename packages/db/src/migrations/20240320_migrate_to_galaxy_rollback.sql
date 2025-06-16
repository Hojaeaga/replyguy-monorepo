-- Rollback migration for Galaxy system
-- This will move data back to user_embeddings table

-- First, update user_embeddings with data from new tables
UPDATE user_embeddings ue
SET 
    summary = nu.raw_summary,
    embeddings = nue.embedding,
    last_updated = COALESCE(nue.created_at, nu.created_at)
FROM new_users nu
LEFT JOIN new_user_embeddings nue ON nu.fid = nue.fid
WHERE ue.fid::text = nu.fid;

-- Update metadata with keywords
WITH user_keywords AS (
    SELECT 
        fid,
        jsonb_agg(jsonb_build_object('topic', topic, 'weight', weight)) as keywords
    FROM new_user_keywords
    GROUP BY fid
)
UPDATE user_embeddings ue
SET metadata = COALESCE(metadata, '{}'::jsonb) || 
    jsonb_build_object('keywords', uk.keywords)
FROM user_keywords uk
WHERE ue.fid::text = uk.fid;

-- Note: We don't need to rollback new_user_similarity_edges and new_user_feed_matches
-- as they are computed data that can be regenerated

-- Drop indexes if they exist
DROP INDEX IF EXISTS idx_new_user_embeddings_embedding;
DROP INDEX IF EXISTS idx_new_cast_embeddings_embedding;
DROP INDEX IF EXISTS idx_new_user_feed_matches_fid;
DROP INDEX IF EXISTS idx_new_user_feed_matches_match_score;
DROP INDEX IF EXISTS idx_new_user_similarity_edges_fid_a;
DROP INDEX IF EXISTS idx_new_user_similarity_edges_fid_b; 