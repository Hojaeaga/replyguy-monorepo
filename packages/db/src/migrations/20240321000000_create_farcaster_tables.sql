-- Create extension for vector operations if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create farcaster_users table
CREATE TABLE farcaster_users (
  fid BIGINT PRIMARY KEY,
  bio TEXT,
  summary TEXT,
  embedding VECTOR(1536),
  following_count INT,
  follower_count INT,
  channels TEXT[],
  casts TEXT[],
  connected_address TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create farcaster_user_similarity table
CREATE TABLE farcaster_user_similarity (
  fid_1 BIGINT,
  fid_2 BIGINT,
  similarity FLOAT,
  PRIMARY KEY(fid_1, fid_2),
  FOREIGN KEY (fid_1) REFERENCES farcaster_users(fid),
  FOREIGN KEY (fid_2) REFERENCES farcaster_users(fid)
);

-- Create indexes for better query performance
CREATE INDEX idx_farcaster_users_embedding ON farcaster_users USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_farcaster_user_similarity_fid1 ON farcaster_user_similarity(fid_1);
CREATE INDEX idx_farcaster_user_similarity_fid2 ON farcaster_user_similarity(fid_2); 