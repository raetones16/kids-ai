// Import dependencies
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

let db;
let initializeSchema;
let fixChildParentRelationship;

// Initialize the database with better error handling
try {
  console.log('Loading database module...');
  const dbModule = require('./db');
  db = dbModule.db;
  initializeSchema = dbModule.initializeSchema;
  console.log('Database module loaded successfully');
  
  try {
    const relationshipFix = require('./fix-parent-child-relationship');
    fixChildParentRelationship = relationshipFix.fixChildParentRelationship;
    console.log('Relationship fix module loaded successfully');
  } catch (fixError) {
    console.error('Failed to load relationship fix module:', fixError);
    fixChildParentRelationship = async () => console.log('Using mock relationship fix');
  }
} catch (dbError) {
  console.error('Failed to load database module:', dbError);
  // Create a mock db object to allow the server to start without the database
  db = {
    execute: async () => ({ rows: [] })
  };
  initializeSchema = async () => console.log('Using mock schema initialization');
  fixChildParentRelationship = async () => console.log('Using mock relationship fix');
}

// Initialize database schema with error handling
(async () => {
  try {
    await initializeSchema();
    console.log("Database schema initialized successfully");

    // Add performance indexes
    try {
      console.log("Adding performance indexes...");

      // Add index for faster conversation lookups by child_id
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_conversations_child_id
        ON conversations(child_id)
      `).catch(e => console.error('Error creating idx_conversations_child_id:', e));
      console.log("Added index on conversations.child_id");

      // Add index for faster message lookups by conversation_id
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
        ON messages(conversation_id)
      `).catch(e => console.error('Error creating idx_messages_conversation_id:', e));
      console.log("Added index on messages.conversation_id");

      // Add index for conversations sorted by last_activity_at
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_conversations_last_activity
        ON conversations(last_activity_at DESC)
      `).catch(e => console.error('Error creating idx_conversations_last_activity:', e));
      console.log("Added index on conversations.last_activity_at");

      console.log("Performance indexes added successfully");
    } catch (indexError) {
      console.error("Error adding indexes:", indexError);
    }

    // Fix parent-child relationships
    try {
      console.log("Running parent-child relationship fix...");
      await fixChildParentRelationship();
      console.log("Parent-child relationship fix completed successfully");
    } catch (fixError) {
      console.error("Error running parent-child relationship fix:", fixError);
    }
  } catch (err) {
    console.error("Database initialization warning:", err);
    console.log("Continuing without full database initialization...");
  }
})();

// Import route handlers
const searchRoutes = require("./routes/search");
const profilesRoutes = require("./routes/profiles");
const conversationsRoutes = require("./routes/conversations");
const settingsRoutes = require("./routes/settings");
const migrationRoutes = require("./routes/migration");
const authRoutes = require("./routes/auth");
const statsRoutes = require("./routes/stats");
const aiRoutes = require("./routes/ai");

// Create Express app
const app = express();

// Set port
const PORT = process.env.PORT || 3001;

// Middleware - Updated CORS configuration
app.use(
  cors({
    origin: '*',  // Temporarily allow all origins for testing
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Basic health check endpoints
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Kids-AI backend is running (root)" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Kids-AI backend is running" });
});

// Routes
app.use("/api/search", searchRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/migration", migrationRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/ai", aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kids-AI backend server running on port ${PORT}`);
});
