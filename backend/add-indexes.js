// add-indexes.js - Script to add performance-improving indexes to the database
const { db, initializeSchema } = require('./db');

async function addIndexes() {
  try {
    console.log('Adding indexes to improve query performance...');
    
    // Wait for schema initialization first
    await initializeSchema();
    
    // Add index for faster conversation lookups by child_id
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_child_id 
      ON conversations(child_id)
    `);
    console.log('Added index on conversations.child_id');
    
    // Add index for faster message lookups by conversation_id
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
      ON messages(conversation_id)
    `);
    console.log('Added index on messages.conversation_id');
    
    // Add index for conversations sorted by last_activity_at
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_last_activity 
      ON conversations(last_activity_at DESC)
    `);
    console.log('Added index on conversations.last_activity_at');
    
    console.log('Indexes added successfully');
  } catch (error) {
    console.error('Error adding indexes:', error);
  }
}

// Run the function
addIndexes().then(() => {
  console.log('Finished adding indexes');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
