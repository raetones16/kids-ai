-- Child profiles table with parent relationship
CREATE TABLE IF NOT EXISTS child_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  dob TEXT NOT NULL,
  color TEXT,
  custom_instructions TEXT,
  parent_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parent_profiles(id) ON DELETE CASCADE
);

-- Create index for faster parent-child lookups
CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id ON child_profiles(parent_id);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  child_id INTEGER NOT NULL,
  thread_id TEXT NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_id) REFERENCES child_profiles(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row allowed
  parent_pin TEXT NOT NULL DEFAULT '000000',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize settings with default PIN using REPLACE to avoid constraint errors
INSERT OR REPLACE INTO settings (id, parent_pin) VALUES (1, '000000');
