import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
console.log('Looking for .env file at:', envPath);
console.log('File exists:', fs.existsSync(envPath));

config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', supabaseUrl ? 'exists' : 'undefined');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'exists' : 'undefined');

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMigration() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '20240320_migrate_to_galaxy_4_similarity_edges.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        console.error('Error executing statement:', error);
        console.error('Statement:', statement);
        throw error;
      }
    }

    console.log('Successfully set up migration');
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

// Run the setup
setupMigration().catch(console.error); 