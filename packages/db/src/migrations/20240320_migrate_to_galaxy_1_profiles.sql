-- Part 1: Migrate user profiles
-- This is a lightweight operation that should complete quickly

INSERT INTO new_users (fid, raw_summary, created_at)
SELECT 
    fid::text,
    summary,
    last_updated
FROM user_embeddings
WHERE summary IS NOT NULL
ON CONFLICT (fid) DO NOTHING; 