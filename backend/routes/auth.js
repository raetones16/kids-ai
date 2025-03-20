const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Helper function to generate a session ID
function generateSessionId() {
  return `session-${crypto.randomBytes(16).toString('hex')}`;
}

// Helper function to get current time as ISO string
function getNow() {
  return new Date().toISOString();
}

// Helper function to get expiration date (24 hours from now)
function getExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + 24);
  return expirationDate.toISOString();
}

// POST /api/auth/login - Login for parent
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find parent account
    const result = await db.execute({
      sql: 'SELECT id, username, password FROM parent_profiles WHERE username = ?',
      args: [username]
    });
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const parent = result.rows[0];
    
    // Compare password with hashed password
    const passwordMatch = await bcrypt.compare(password, parent.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create new session
    const sessionId = generateSessionId();
    const now = getNow();
    const expires = getExpirationDate();
    
    await db.execute({
      sql: 'INSERT INTO sessions (id, user_id, user_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      args: [sessionId, parent.id, 'parent', now, expires]
    });
    
    res.json({
      sessionId,
      user: {
        id: parent.id,
        username: parent.username,
        type: 'parent'
      },
      expiresAt: expires
    });
  } catch (error) {
    console.error('Error during login:', error);
    next(error);
  }
});

// PUT /api/auth/update-credentials - Update parent credentials
router.put('/update-credentials', async (req, res, next) => {
  try {
    const { username, password, currentUsername } = req.body;
    
    if (!username || !password || !currentUsername) {
      return res.status(400).json({ error: 'Username, current username, and password are required' });
    }
    
    // Find parent account by current username
    const findResult = await db.execute({
      sql: 'SELECT id FROM parent_profiles WHERE username = ?',
      args: [currentUsername]
    });
    
    if (findResult.rows.length === 0) {
      return res.status(404).json({ error: 'Current account not found' });
    }
    
    const parentId = findResult.rows[0].id;
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update parent account
    await db.execute({
      sql: 'UPDATE parent_profiles SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [username, hashedPassword, parentId]
    });
    
    res.json({
      success: true,
      message: 'Credentials updated successfully',
      username
    });
  } catch (error) {
    console.error('Error updating credentials:', error);
    next(error);
  }
});

// POST /api/auth/child-login - Login for child
router.post('/child-login', async (req, res, next) => {
  try {
    const { childId } = req.body;
    
    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required' });
    }
    
    // Find child profile
    const result = await db.execute({
      sql: 'SELECT id, name FROM child_profiles WHERE id = ?',
      args: [childId]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }
    
    const child = result.rows[0];
    
    // Create new session
    const sessionId = generateSessionId();
    const now = getNow();
    const expires = getExpirationDate();
    
    await db.execute({
      sql: 'INSERT INTO sessions (id, user_id, user_type, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      args: [sessionId, child.id, 'child', now, expires]
    });
    
    res.json({
      sessionId,
      user: {
        id: child.id,
        name: child.name,
        type: 'child'
      },
      expiresAt: expires
    });
  } catch (error) {
    console.error('Error during child login:', error);
    next(error);
  }
});

// GET /api/auth/session/:id - Validate and get session
router.get('/session/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const now = getNow();
    
    // Find session
    const sessionResult = await db.execute({
      sql: 'SELECT * FROM sessions WHERE id = ? AND expires_at > ?',
      args: [id, now]
    });
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    const session = sessionResult.rows[0];
    
    // Get user based on type
    let user;
    if (session.user_type === 'parent') {
      const parentResult = await db.execute({
        sql: 'SELECT id, username FROM parent_profiles WHERE id = ?',
        args: [session.user_id]
      });
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      user = {
        ...parentResult.rows[0],
        type: 'parent'
      };
    } else if (session.user_type === 'child') {
      const childResult = await db.execute({
        sql: 'SELECT id, name FROM child_profiles WHERE id = ?',
        args: [session.user_id]
      });
      if (childResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      user = {
        ...childResult.rows[0],
        type: 'child'
      };
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    res.json({
      sessionId: session.id,
      user,
      expiresAt: session.expires_at
    });
  } catch (error) {
    console.error('Error validating session:', error);
    next(error);
  }
});

// POST /api/auth/logout - Logout (invalidate session)
router.post('/logout', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Delete session
    await db.execute({
      sql: 'DELETE FROM sessions WHERE id = ?',
      args: [sessionId]
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    next(error);
  }
});

module.exports = router;