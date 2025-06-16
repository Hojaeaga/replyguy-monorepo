-- Part 5: Create feed matches
-- This operation matches users with trending posts
-- We'll process it in batches to avoid timeouts

-- First, create a temporary table for trending casts
CREATE TEMP TABLE IF NOT EXISTS temp_trending_casts AS
SELECT hash, embedding
FROM new_casts c
JOIN new_cast_embeddings ce ON c.hash = ce.hash
WHERE c.created_at > NOW() - INTERVAL '7 days'
ORDER BY c.engagement DESC
LIMIT 100;

-- Process subscribed users in batches
DO $$
DECLARE
    batch_size INTEGER := 50;
    total_users INTEGER;
    num_batches INTEGER;
    current_batch INTEGER := 0;
BEGIN
    -- Get total number of subscribed users
    SELECT COUNT(*) INTO total_users 
    FROM user_embeddings 
    WHERE is_subscribed = true 
    AND embeddings IS NOT NULL;
    
    num_batches := CEIL(total_users::float / batch_size);

    -- Process each batch
    WHILE current_batch < num_batches LOOP
        -- Insert matches for current batch
        INSERT INTO new_user_feed_matches (fid, hash, match_score, reason, created_at)
        SELECT 
            u.fid::text,
            c.hash,
            1 - (u.embeddings <=> c.embedding) as match_score,
            'Initial migration match' as reason,
            NOW()
        FROM (
            SELECT fid, embeddings
            FROM user_embeddings
            WHERE is_subscribed = true
            AND embeddings IS NOT NULL
            ORDER BY fid
            LIMIT batch_size
            OFFSET (current_batch * batch_size)
        ) u
        CROSS JOIN temp_trending_casts c
        WHERE 1 - (u.embeddings <=> c.embedding) > 0.4
        ON CONFLICT (fid, hash) DO NOTHING;

        current_batch := current_batch + 1;
        
        -- Optional: Add a small delay between batches
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Clean up
DROP TABLE IF EXISTS temp_trending_casts; 