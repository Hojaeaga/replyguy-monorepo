-- Part 6: Create indexes
-- This is the final step that creates all necessary indexes

-- Create vector similarity indexes
CREATE INDEX IF NOT EXISTS idx_new_user_embeddings_embedding 
ON new_user_embeddings USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_new_cast_embeddings_embedding 
ON new_cast_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Create feed match indexes
CREATE INDEX IF NOT EXISTS idx_new_user_feed_matches_fid 
ON new_user_feed_matches (fid);

CREATE INDEX IF NOT EXISTS idx_new_user_feed_matches_match_score 
ON new_user_feed_matches (match_score DESC);

-- Create similarity edge indexes
CREATE INDEX IF NOT EXISTS idx_new_user_similarity_edges_fid_a 
ON new_user_similarity_edges (fid_a);

CREATE INDEX IF NOT EXISTS idx_new_user_similarity_edges_fid_b 
ON new_user_similarity_edges (fid_b); 