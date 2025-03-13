const { createClient } = require('@libsql/client');
require('dotenv').config();

// Check if we have the required environment variables
const dbUrl = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

if (!dbUrl || !authToken) {
  console.warn('Database credentials not found in environment variables. Using in-memory SQLite.');
}

// Create client (with fallback to in-memory SQLite for development)
let client;

// Try to connect to Turso, with fallback to in-memory SQLite
if (dbUrl && authToken) {
  try {
    client = createClient({
      url: dbUrl,
      authToken: authToken,
      // Add timeout and connection retry options
      fetch_options: {
        timeout: 10000, // 10 second timeout
      }
    });
    console.log('Connected to Turso database');
  } catch (error) {
    console.error('Failed to connect to Turso database:', error);
    console.log('Falling back to in-memory SQLite');
    client = createClient({
      url: 'file:memdb1?mode=memory&cache=shared'
    });
  }
} else {
  client = createClient({
    url: 'file:memdb1?mode=memory&cache=shared'
  });
  console.log('Using in-memory SQLite database');
}

// Cache to store if our schema has been initialized
let schemaInitialized = false;

// Initialize database schema if using in-memory database
async function initializeSchema() {
  if (schemaInitialized) return;
  
  try {
    console.log('Setting up database schema...');
    
    // Drop existing tables to avoid schema mismatch issues
    try {
      await client.execute('DROP TABLE IF EXISTS messages');
      await client.execute('DROP TABLE IF EXISTS conversations');
      console.log('Dropped existing tables');
    } catch (dropError) {
      console.warn('Error dropping tables (may not exist):', dropError);
    }
    
    // Create tables with error handling for each
    try {
      // Child profiles table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS child_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          dob TEXT NOT NULL,
          color TEXT,
          custom_instructions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (profileError) {
      console.error('Error creating child_profiles table:', profileError);
    }
    
    try {
      // Conversations table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          child_id INTEGER NOT NULL,
          thread_id TEXT NOT NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (convError) {
      console.error('Error creating conversations table:', convError);
    }
    
    try {
      // Messages table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (msgError) {
      console.error('Error creating messages table:', msgError);
    }
    
    try {
      // Settings table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          parent_pin TEXT NOT NULL DEFAULT '000000',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default settings with INSERT OR REPLACE to avoid constraint errors
      await client.execute(`
        INSERT OR REPLACE INTO settings (id, parent_pin) VALUES (1, '000000')
      `);
    } catch (settingsError) {
      console.error('Error creating settings table:', settingsError);
    }
    
    console.log('In-memory database schema initialized successfully');
    schemaInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    // Don't throw error to allow app to continue with limited functionality
    schemaInitialized = true; // Mark as initialized anyway to avoid repeated attempts
  }
}

// Force schema initialization on module import (even for Turso DB) for initial setup
initializeSchema().catch(err => {
  console.error('Database initialization error:', err);
  process.exit(1);
});

module.exports = {
  db: client,
  initializeSchema
};
