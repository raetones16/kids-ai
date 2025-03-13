// Import dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize the database
const { db, initializeSchema } = require('./db');

// Initialize database schema with error handling
initializeSchema().catch(err => {
  console.error('Database initialization warning:', err);
  console.log('Continuing without full database initialization...');
  // Don't exit process, allow server to start anyway with limited functionality
});

// Import route handlers
const searchRoutes = require('./routes/search');
const profilesRoutes = require('./routes/profiles');
const conversationsRoutes = require('./routes/conversations');
const settingsRoutes = require('./routes/settings');
const migrationRoutes = require('./routes/migration');

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
