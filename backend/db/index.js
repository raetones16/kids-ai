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

// Initialize database schema
async function initializeSchema() {
  if (schemaInitialized) return;
  
  try {
    console.log('Setting up database schema...');
    
    // Create tables with error handling for each
    try {
      // Parent profiles table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS parent_profiles (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insert default parent account if none exists
      const parentCheck = await client.execute('SELECT COUNT(*) as count FROM parent_profiles');
      if (parentCheck.rows[0].count === 0) {
        await client.execute({
          sql: `
            INSERT INTO parent_profiles (id, username, password)
            VALUES (?, ?, ?)
          `,
          args: ['parent', 'parent', 'password123']
        });
        console.log('Created default parent account');
      }
    } catch (parentProfileError) {
      console.error('Error creating parent_profiles table:', parentProfileError);
    }
    
    try {
      // Sessions table for authentication
      await client.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_type TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL
        )
      `);
    } catch (sessionsError) {
      console.error('Error creating sessions table:', sessionsError);
    }
    
    try {
      // Child profiles table - updated to use string IDs
      await client.execute(`
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
    } catch (profileError) {
      console.error('Error creating child_profiles table:', profileError);
    }
    
    try {
      // Conversations table - update to use string IDs throughout
      await client.execute(`
        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          child_id TEXT NOT NULL,
          thread_id TEXT NOT NULL,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (child_id) REFERENCES child_profiles(id)
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
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
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
    
    console.log('Database schema initialized successfully');
    schemaInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    // Don't throw error to allow app to continue with limited functionality
    schemaInitialized = true; // Mark as initialized anyway to avoid repeated attempts
  }
}

module.exports = {
  db: client,
  initializeSchema
};
