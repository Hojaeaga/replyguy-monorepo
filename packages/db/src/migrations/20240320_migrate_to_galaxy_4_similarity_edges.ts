import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '../../.env');
console.log('Looking for .env file at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;


console.log(supabaseUrl, supabaseKey);
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Checkpoint {
  id: number;
  migration_name: string;
  last_processed_batch: number;
  total_batches: number;
  started_at: string;
  last_updated: string;
}

async function createCheckpointTable() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS migration_checkpoints (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        last_processed_batch INTEGER NOT NULL,
        total_batches INTEGER NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });

  if (error) throw error;
}

async function getOrCreateCheckpoint(migrationName: string, totalBatches: number): Promise<Checkpoint> {
  const { data: existingCheckpoint, error: fetchError } = await supabase
    .from('migration_checkpoints')
    .select('*')
    .eq('migration_name', migrationName)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

  if (existingCheckpoint) {
    return existingCheckpoint as Checkpoint;
  }

  const { data: newCheckpoint, error: insertError } = await supabase
    .from('migration_checkpoints')
    .insert({
      migration_name: migrationName,
      last_processed_batch: 0,
      total_batches: totalBatches
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return newCheckpoint as Checkpoint;
}

async function updateCheckpoint(checkpointId: number, batchNumber: number) {
  const { error } = await supabase
    .from('migration_checkpoints')
    .update({
      last_processed_batch: batchNumber,
      last_updated: new Date().toISOString()
    })
    .eq('id', checkpointId);

  if (error) throw error;
}

async function processBatch(batchNumber: number, batchSize: number, comparisonLimit: number) {
  // Create temp table for this batch
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TEMP TABLE IF NOT EXISTS temp_user_pairs (
        fid_a text,
        fid_b text,
        similarity float
      );
      CREATE INDEX IF NOT EXISTS idx_temp_user_pairs_fid ON temp_user_pairs (fid_a, fid_b);
    `
  });

  // Clear temp table
  await supabase.rpc('exec_sql', {
    sql: 'TRUNCATE temp_user_pairs;'
  });

  // Insert pairs for current batch
  const { error: insertError } = await supabase.rpc('exec_sql', {
    sql: `
      WITH batch_users AS (
        SELECT fid, embeddings 
        FROM user_embeddings 
        WHERE embeddings IS NOT NULL
        ORDER BY fid
        LIMIT ${batchSize} 
        OFFSET (${batchNumber} * ${batchSize})
      ),
      comparison_limit AS (
        SELECT fid, embeddings
        FROM user_embeddings
        WHERE embeddings IS NOT NULL
        ORDER BY fid
        LIMIT ${comparisonLimit}
      )
      INSERT INTO temp_user_pairs
      SELECT 
        a.fid::text as fid_a,
        b.fid::text as fid_b,
        (a.embeddings <=> b.embeddings) as similarity
      FROM batch_users a
      JOIN comparison_limit b ON a.fid < b.fid
      WHERE (a.embeddings <=> b.embeddings) < 0.8;
    `
  });

  if (insertError) throw insertError;

  // Process pairs in chunks
  const chunkSize = 50;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { error: insertChunkError } = await supabase.rpc('exec_sql', {
      sql: `
        WITH pairs AS (
          SELECT fid_a, fid_b, similarity
          FROM temp_user_pairs
          ORDER BY fid_a, fid_b
          LIMIT ${chunkSize}
          OFFSET ${offset}
        )
        INSERT INTO new_user_similarity_edges (fid_a, fid_b, similarity, computed_at)
        SELECT 
          fid_a,
          fid_b,
          1 - similarity as similarity,
          NOW()
        FROM pairs
        ON CONFLICT (fid_a, fid_b) DO NOTHING;
      `
    });

    if (insertChunkError) throw insertChunkError;

    // Check if we have more pairs to process
    const { data: remainingCount, error: countError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as count
        FROM temp_user_pairs
        OFFSET ${offset + chunkSize}
        LIMIT 1;
      `
    });

    if (countError) throw countError;
    hasMore = (remainingCount[0]?.count || 0) > 0;
    offset += chunkSize;

    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Clean up temp table
  await supabase.rpc('exec_sql', {
    sql: 'DROP TABLE IF EXISTS temp_user_pairs;'
  });
}

async function runMigration() {
  const migrationName = 'similarity_edges_migration';
  const batchSize = 2;
  const comparisonLimit = 20;

  try {
    // Create checkpoint table
    await createCheckpointTable();

    // Get total number of users
    const { data: totalUsers, error: countError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as count 
        FROM user_embeddings 
        WHERE embeddings IS NOT NULL;
      `
    });

    if (countError) throw countError;

    const totalBatches = Math.ceil((totalUsers[0]?.count || 0) / batchSize);
    console.log(`Starting migration for ${totalUsers[0]?.count} users in ${totalBatches} batches`);

    // Get or create checkpoint
    const checkpoint = await getOrCreateCheckpoint(migrationName, totalBatches);
    let currentBatch = checkpoint.last_processed_batch;

    const startTime = Date.now();

    while (currentBatch < totalBatches) {
      const batchStartTime = Date.now();
      console.log(`Processing batch ${currentBatch + 1}/${totalBatches} (${((currentBatch + 1) / totalBatches * 100).toFixed(2)}%)`);

      await processBatch(currentBatch, batchSize, comparisonLimit);

      // Update checkpoint
      await updateCheckpoint(checkpoint.id, currentBatch + 1);

      const batchDuration = (Date.now() - batchStartTime) / 1000;
      console.log(`Completed batch in ${batchDuration.toFixed(2)} seconds`);

      currentBatch++;
      
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up checkpoint
    await supabase
      .from('migration_checkpoints')
      .delete()
      .eq('id', checkpoint.id);

    const totalDuration = (Date.now() - startTime) / 1000;
    console.log(`Migration completed in ${totalDuration.toFixed(2)} seconds`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
runMigration().catch(console.error); 