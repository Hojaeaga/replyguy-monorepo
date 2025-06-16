-- Part 3: Migrate user keywords
-- This operation processes JSON data but should be relatively quick

INSERT INTO new_user_keywords (fid, topic, weight)
SELECT 
    fid::text,
    keyword,
    1.0 as weight
FROM user_embeddings,
     jsonb_array_elements_text(metadata->'keywords') as keyword
WHERE metadata->'keywords' IS NOT NULL
ON CONFLICT (fid, topic) DO NOTHING; 