-- Part 4: Create similarity edges
-- This is a heavy operation that computes similarities between all users
-- We'll process it in very small batches with checkpointing

-- Create a checkpoint table to track progress
CREATE TABLE IF NOT EXISTS migration_checkpoints (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    last_processed_batch INTEGER NOT NULL,
    total_batches INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- First, create a temporary table to store user pairs
CREATE TEMP TABLE IF NOT EXISTS temp_user_pairs (
    fid_a text,
    fid_b text,
    similarity float
);

-- Create an index on the temp table for better performance
CREATE INDEX IF NOT EXISTS idx_temp_user_pairs_fid ON temp_user_pairs (fid_a, fid_b);

-- Process users in very small batches
DO $$
DECLARE
    batch_size INTEGER := 2; -- Very small batch size
    comparison_limit INTEGER := 20; -- Limit comparisons per batch
    chunk_size INTEGER := 50; -- Process pairs in small chunks
    total_users INTEGER;
    num_batches INTEGER;
    current_batch INTEGER;
    start_time TIMESTAMP;
    batch_start_time TIMESTAMP;
    checkpoint_id INTEGER;
    similarity_edges_migration_name TEXT := 'similarity_edges_migration';
    pairs_processed INTEGER;
    current_chunk INTEGER;
    total_chunks INTEGER;
BEGIN
    -- Get total number of users
    SELECT COUNT(*) INTO total_users FROM user_embeddings WHERE embeddings IS NOT NULL;
    num_batches := CEIL(total_users::float / batch_size);
    
    -- Get or create checkpoint
    SELECT id INTO checkpoint_id 
    FROM migration_checkpoints 
    WHERE migration_name = similarity_edges_migration_name;
    
    IF checkpoint_id IS NULL THEN
        INSERT INTO migration_checkpoints (migration_name, last_processed_batch, total_batches)
        VALUES (similarity_edges_migration_name, 0, num_batches)
        RETURNING id INTO checkpoint_id;
        current_batch := 0;
    ELSE
        SELECT last_processed_batch INTO current_batch 
        FROM migration_checkpoints 
        WHERE id = checkpoint_id;
    END IF;
    
    start_time := clock_timestamp();
    RAISE NOTICE 'Starting/Resuming similarity computation for % users in % batches. Starting from batch %',
        total_users, num_batches, current_batch + 1;

    -- Process each batch
    WHILE current_batch < num_batches LOOP
        batch_start_time := clock_timestamp();
        
        -- Clear temp table for this batch
        TRUNCATE temp_user_pairs;

        -- Insert pairs for current batch
        -- Process only a small subset of comparisons
        WITH batch_users AS (
            SELECT fid, embeddings 
            FROM user_embeddings 
            WHERE embeddings IS NOT NULL
            ORDER BY fid
            LIMIT batch_size 
            OFFSET (current_batch * batch_size)
        ),
        comparison_limit AS (
            SELECT fid, embeddings
            FROM user_embeddings
            WHERE embeddings IS NOT NULL
            ORDER BY fid
            LIMIT comparison_limit -- Limit number of comparisons per batch user
        )
        INSERT INTO temp_user_pairs
        SELECT 
            a.fid::text as fid_a,
            b.fid::text as fid_b,
            (a.embeddings <=> b.embeddings) as similarity
        FROM batch_users a
        JOIN comparison_limit b ON a.fid < b.fid
        WHERE (a.embeddings <=> b.embeddings) < 0.8;

        -- Get count of processed pairs and calculate chunks
        SELECT COUNT(*) INTO pairs_processed FROM temp_user_pairs;
        total_chunks := CEIL(pairs_processed::float / chunk_size);
        current_chunk := 0;

        -- Process pairs in chunks
        WHILE current_chunk < total_chunks LOOP
            -- Insert from temp table to final table in very small chunks
            WITH pairs AS (
                SELECT fid_a, fid_b, similarity
                FROM temp_user_pairs
                ORDER BY fid_a, fid_b
                LIMIT chunk_size
                OFFSET (current_chunk * chunk_size)
            )
            INSERT INTO new_user_similarity_edges (fid_a, fid_b, similarity, computed_at)
            SELECT 
                fid_a,
                fid_b,
                1 - similarity as similarity,
                NOW()
            FROM pairs
            ON CONFLICT (fid_a, fid_b) DO NOTHING;

            current_chunk := current_chunk + 1;
            
            -- Small delay between chunks
            PERFORM pg_sleep(0.1);
        END LOOP;

        -- Update checkpoint
        UPDATE migration_checkpoints 
        SET last_processed_batch = current_batch + 1,
            last_updated = NOW()
        WHERE id = checkpoint_id;

        -- Log progress
        RAISE NOTICE 'Completed batch %/% (%.2f%%) in % seconds. Processed % pairs in % chunks.',
            current_batch + 1,
            num_batches,
            ((current_batch + 1)::float / num_batches * 100),
            EXTRACT(EPOCH FROM (clock_timestamp() - batch_start_time)),
            pairs_processed,
            total_chunks;

        current_batch := current_batch + 1;
        
        -- Longer delay between batches
        PERFORM pg_sleep(1.0);
    END LOOP;

    -- Log final statistics
    RAISE NOTICE 'Completed all batches in % seconds', 
        EXTRACT(EPOCH FROM (clock_timestamp() - start_time));
        
    -- Clean up checkpoint
    DELETE FROM migration_checkpoints WHERE id = checkpoint_id;
END $$;

-- Clean up
DROP TABLE IF EXISTS temp_user_pairs;

-- Create a function to execute SQL queries safely
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN '{"success": true}'::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated; 