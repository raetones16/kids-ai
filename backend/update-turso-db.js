/**
 * Script to update an existing Turso database with our schema
 * Run this script after creating a database with the Turso CLI
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
require('dotenv').config();

// Check if Turso credentials are provided
const dbUrl = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_DB_AUTH_TOKEN;

if (!dbUrl || !authToken) {
  console.error('Error: TURSO_DB_URL and TURSO_DB_AUTH_TOKEN must be set in .env file');
  process.exit(1);
}

// Create client
const client = createClient({
  url: dbUrl,
  authToken: authToken
});

async function initializeSchema() {
  try {
    console.log('Setting up Turso database schema...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'db', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const stmt of statements) {
      console.log(`Executing: ${stmt.substring(0, 60)}...`);
      await client.execute(stmt);
    }
    
    console.log('Database schema initialized successfully!');
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

// Run the initialization
initializeSchema()
  .then(() => {
    console.log('Database setup complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
  });
