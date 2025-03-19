const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

// Helper to generate a unique profile ID
function generateProfileId() {
  return `profile-${crypto.randomBytes(8).toString('hex')}`;
}

// Helper to get parent ID from session
async function getParentIdFromSession(sessionId) {
  try {
    if (!sessionId) {
      console.warn('No session ID provided when getting parent ID');
      return null;
    }
    
    const result = await db.execute({
      sql: 'SELECT user_id, user_type FROM sessions WHERE id = ?',
      args: [sessionId]
    });
    
    if (result.rows.length === 0) {
      console.warn(`No session found for ID: ${sessionId}`);
      return null;
    }
    
    const session = result.rows[0];
    
    // Only return the user_id if this is a parent session
    if (session.user_type === 'parent') {
      return session.user_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting parent ID from session:', error);
    return null;
  }
}

// Authentication middleware for parent-only routes
async function requireParent(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const sessionId = authHeader.substring(7); // Remove 'Bearer ' from string
    const parentId = await getParentIdFromSession(sessionId);
    
    if (!parentId) {
      return res.status(403).json({ error: 'Parent access required' });
    }
    
    // Add parentId to request for use in route handlers
    req.parentId = parentId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

// GET /api/profiles - Get all child profiles for the authenticated parent
router.get('/', async (req, res, next) => {
  try {
    // Extract session token if available
    const authHeader = req.headers.authorization;
    let parentId = null;
    
    // If authenticated, only show profiles for that parent
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      parentId = await getParentIdFromSession(sessionId);
    }
    
    let result;
    if (parentId) {
      // Get profiles for this parent only
      console.log(`Querying profiles for parent: ${parentId}`);
      result = await db.execute({
        sql: 'SELECT * FROM child_profiles WHERE parent_id = ?',
        args: [parentId]
      });
    } else {
      // No parent ID - either show all or return empty based on policy
      console.log('No parent ID found in session, showing all profiles');
      result = await db.execute('SELECT * FROM child_profiles');
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting profiles:', error);
    next(error);
  }
});

// GET /api/profiles/:id - Get a specific child profile (with parent check when authenticated)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Extract session token if available
    const authHeader = req.headers.authorization;
    let parentId = null;
    
    // If authenticated, verify the profile belongs to that parent
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      parentId = await getParentIdFromSession(sessionId);
    }
    
    let result;
    if (parentId) {
      // Check profile belongs to parent
      result = await db.execute({
        sql: 'SELECT * FROM child_profiles WHERE id = ? AND parent_id = ?',
        args: [id, parentId]
      });
    } else {
      // No parent ID check
      result = await db.execute({
        sql: 'SELECT * FROM child_profiles WHERE id = ?',
        args: [id]
      });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting profile:', error);
    next(error);
  }
});

// POST /api/profiles - Create a new child profile
router.post('/', async (req, res, next) => {
  try {
    const { name, dob, color, customInstructions } = req.body;
    
    // Validate required fields
    if (!name || !dob) {
      return res.status(400).json({ error: 'Name and date of birth are required' });
    }
    
    // Generate a unique ID for the profile
    const profileId = req.body.id || generateProfileId();
    
    // Get parent ID from session if available
    const authHeader = req.headers.authorization;
    let parentId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      parentId = await getParentIdFromSession(sessionId);
    }
    
    // If no parent ID available, get the first parent as default
    if (!parentId) {
      const parents = await db.execute('SELECT id FROM parent_profiles LIMIT 1');
      if (parents.rows.length > 0) {
        parentId = parents.rows[0].id;
      }
    }
    
    // Create profile with parent_id
    await db.execute({
      sql: `
        INSERT INTO child_profiles (id, name, dob, color, custom_instructions, parent_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [profileId, name, dob, color || null, customInstructions || null, parentId]
    });

    // Return the created profile
    const now = new Date().toISOString();
    res.status(201).json({
      id: profileId,
      name,
      dob,
      color,
      custom_instructions: customInstructions,
      parent_id: parentId,
      created_at: now,
      updated_at: now
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    next(error);
  }
});

// PUT /api/profiles/:id - Update a child profile (with parent check when authenticated)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, dob, color, customInstructions } = req.body;

    // Extract session token if available
    const authHeader = req.headers.authorization;
    let parentId = null;
    
    // If authenticated, verify the profile belongs to that parent
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      parentId = await getParentIdFromSession(sessionId);
    }

    // Check if profile exists and belongs to this parent if parentId is available
    let checkResult;
    if (parentId) {
      checkResult = await db.execute({
        sql: 'SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?',
        args: [id, parentId]
      });
    } else {
      checkResult = await db.execute({
        sql: 'SELECT id FROM child_profiles WHERE id = ?',
        args: [id]
      });
    }

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile
    let updateQuery;
    let queryArgs;
    
    if (parentId) {
      updateQuery = `
        UPDATE child_profiles 
        SET name = ?, dob = ?, color = ?, custom_instructions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND parent_id = ?
      `;
      queryArgs = [name, dob, color, customInstructions, id, parentId];
    } else {
      updateQuery = `
        UPDATE child_profiles 
        SET name = ?, dob = ?, color = ?, custom_instructions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      queryArgs = [name, dob, color, customInstructions, id];
    }
    
    await db.execute({
      sql: updateQuery,
      args: queryArgs
    });

    // Get updated profile
    const result = await db.execute({
      sql: 'SELECT * FROM child_profiles WHERE id = ?',
      args: [id]
    });

    // Log the profile for debugging
    console.log(`Profile retrieved from database for id ${id}:`, result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    next(error);
  }
});

// DELETE /api/profiles/:id - Delete a child profile (with parent check when authenticated)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete profile with ID: ${id}`);

    // Extract session token if available
    const authHeader = req.headers.authorization;
    let parentId = null;
    
    // If authenticated, verify the profile belongs to that parent
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7);
      parentId = await getParentIdFromSession(sessionId);
    }

    // Check if profile exists and belongs to this parent if parentId is available
    let checkResult;
    if (parentId) {
      checkResult = await db.execute({
        sql: 'SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?',
        args: [id, parentId]
      });
    } else {
      checkResult = await db.execute({
        sql: 'SELECT id FROM child_profiles WHERE id = ?',
        args: [id]
      });
    }

    if (checkResult.rows.length === 0) {
      console.log(`Profile with ID ${id} not found for deletion` + 
                 (parentId ? ` or doesn't belong to parent ${parentId}` : ''));
      return res.status(404).json({ error: 'Profile not found' });
    }

    try {
      // Get count of related conversations before deletion (for logging)
      const conversationCount = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM conversations WHERE child_id = ?',
        args: [id]
      });
      
      const messageCount = await db.execute({
        sql: `SELECT COUNT(*) as count FROM messages 
              WHERE conversation_id IN (
                SELECT id FROM conversations WHERE child_id = ?
              )`,
        args: [id]
      });
      
      console.log(`Found ${conversationCount.rows[0].count} conversations and ${messageCount.rows[0].count} messages for child ${id}`);
      
      // Delete profile (cascading delete will remove conversations and messages)
      let deleteQuery;
      let queryArgs;
      
      if (parentId) {
        deleteQuery = 'DELETE FROM child_profiles WHERE id = ? AND parent_id = ?';
        queryArgs = [id, parentId];
      } else {
        deleteQuery = 'DELETE FROM child_profiles WHERE id = ?';
        queryArgs = [id];
      }
      
      const deleteResult = await db.execute({
        sql: deleteQuery,
        args: queryArgs
      });
      
      console.log(`Delete result for profile ${id}:`, deleteResult);
      
      // Verify conversations were deleted
      const verifyConversations = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM conversations WHERE child_id = ?',
        args: [id]
      });
      
      if (verifyConversations.rows[0].count > 0) {
        console.warn(`Warning: ${verifyConversations.rows[0].count} conversations still exist for deleted profile ${id}`);
      }
      
      res.status(200).json({ 
        message: 'Profile deleted successfully',
        deletedConversations: conversationCount.rows[0].count,
        deletedMessages: messageCount.rows[0].count
      });
    } catch (deleteError) {
      console.error(`Error in deletion process for profile ${id}:`, deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    next(error);
  }
});

module.exports = router;
