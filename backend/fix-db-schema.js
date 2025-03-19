const { db } = require('./db');

async function migrateDatabase() {
  console.log('Starting database schema fix...');
  
  try {
    // Drop existing tables in reverse order of dependencies
    console.log('Dropping existing tables...');
    await db.execute('DROP TABLE IF EXISTS messages');
    await db.execute('DROP TABLE IF EXISTS conversations');
    await db.execute('DROP TABLE IF EXISTS child_profiles');
    
    // Recreate tables with proper constraints
    console.log('Recreating tables with proper constraints...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS child_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dob TEXT NOT NULL,
        color TEXT,
        custom_instructions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        child_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
      )
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
    
    // Add indexes
    console.log('Adding indexes...');
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_child_id 
      ON conversations(child_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
      ON messages(conversation_id)
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_last_activity 
      ON conversations(last_activity_at DESC)
    `);
    
    console.log('Schema fix completed successfully');
  } catch (error) {
    console.error('Schema fix failed:', error);
  }
}

// Run the migration
migrateDatabase()
  .then(() => console.log('Schema fix finished'))
  .catch(err => console.error('Schema fix error:', err))
  .finally(() => process.exit());
