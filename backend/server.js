// Import dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { fixChildParentRelationship } = require('./fix-parent-child-relationship');

// Load environment variables
dotenv.config();

// Initialize the database
const { db, initializeSchema } = require('./db');

// Initialize database schema with error handling
(async () => {
  try {
    await initializeSchema();
    console.log('Database schema initialized successfully');
    
    // Add performance indexes
    try {
      console.log('Adding performance indexes...');
      
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
      
      console.log('Performance indexes added successfully');
    } catch (indexError) {
      console.error('Error adding indexes:', indexError);
    }
    
    // Fix parent-child relationships
    try {
      console.log('Running parent-child relationship fix...');
      await fixChildParentRelationship();
      console.log('Parent-child relationship fix completed successfully');
    } catch (fixError) {
      console.error('Error running parent-child relationship fix:', fixError);
    }
  } catch (err) {
    console.error('Database initialization warning:', err);
    console.log('Continuing without full database initialization...');
  }
})();

// Import route handlers
const searchRoutes = require('./routes/search');
const profilesRoutes = require('./routes/profiles');
const conversationsRoutes = require('./routes/conversations');
const settingsRoutes = require('./routes/settings');
const migrationRoutes = require('./routes/migration');
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000'
}));
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Kids-AI backend is running' });
});

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kids-AI backend server running on port ${PORT}`);
});
