-- Part 2: Migrate user embeddings
-- This operation involves vector data but is still relatively fast

INSERT INTO new_user_embeddings (fid, embedding, dimensions, source_text, created_at)
SELECT 
    fid::text,
    embeddings,
    vector_dims(embeddings) AS dimensions,
    summary,
    last_updated
FROM user_embeddings
WHERE embeddings IS NOT NULL
ON CONFLICT (fid) DO NOTHING; 