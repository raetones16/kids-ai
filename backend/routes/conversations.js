const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Helper to create a new conversation with a string ID
async function createConversationWithStringId(childId, threadId, conversationId) {
  try {
    // Ensure childId is a number
    const numericChildId = parseInt(childId, 10);
    if (isNaN(numericChildId)) {
      throw new Error(`Invalid child ID format: ${childId}`);
    }
    
    console.log(`Creating conversation with ID ${conversationId} for child ${numericChildId}`);
    
    // Insert conversation with the string ID directly
    await db.execute({
      sql: `
        INSERT INTO conversations (id, child_id, thread_id)
        VALUES (?, ?, ?)
      `,
      args: [conversationId, numericChildId, threadId]
    });
    
    console.log(`Successfully created conversation with ID ${conversationId} for child ${numericChildId}`);
    return conversationId;
  } catch (error) {
    console.error('Error creating conversation with string ID:', error);
    throw error;
  }
}

// GET /api/conversations/child/:childId - Get all conversations for a child
router.get('/child/:childId', async (req, res, next) => {
  try {
    const { childId } = req.params;
    console.log(`Fetching conversations for child ID: ${childId}`);

    // Ensure childId is properly handled as a number
    const numericChildId = parseInt(childId, 10);
    if (isNaN(numericChildId)) {
      console.error(`Invalid child ID: ${childId}`);
      return res.status(400).json({ error: 'Invalid child ID format' });
    }

    console.log(`Searching database for child_id = ${numericChildId}`);
    const result = await db.execute({
      sql: `
        SELECT * FROM conversations 
        WHERE child_id = ? 
        ORDER BY last_activity_at DESC
      `,
      args: [numericChildId]
    });

    console.log(`Found ${result.rows.length} conversations for child ${numericChildId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting conversations:', error);
    next(error);
  }
});

// GET /api/conversations/:id - Get a specific conversation
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try exact match first (string ID)
    let result = await db.execute({
      sql: 'SELECT * FROM conversations WHERE id = ?',
      args: [id]
    });

    // If not found and ID looks like a string ID pattern
    if (result.rows.length === 0 && id.includes('-')) {
      console.log(`Conversation with exact ID ${id} not found`);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting conversation:', error);
    next(error);
  }
});

// GET /api/conversations/:id/messages - Get all messages for a conversation
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if conversation exists with exact ID
    let convCheck = await db.execute({
      sql: 'SELECT id FROM conversations WHERE id = ?',
      args: [id]
    });

    // If not found, return a 404
    if (convCheck.rows.length === 0) {
      console.log(`Conversation with ID ${id} not found for messages`);
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const result = await db.execute({
      sql: `
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC
      `,
      args: [id]
    });

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting messages:', error);
    next(error);
  }
});

// POST /api/conversations - Create a new conversation
router.post('/', async (req, res, next) => {
  try {
    const { childId, threadId, id } = req.body;

    // Validate required fields
    if (!childId || !threadId) {
      return res.status(400).json({ error: 'Child ID and thread ID are required' });
    }

    // Ensure childId is a number
    const numericChildId = parseInt(childId, 10);
    if (isNaN(numericChildId)) {
      return res.status(400).json({ error: 'Invalid child ID format' });
    }

    // Check if child exists
    const childCheck = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [numericChildId]
    });

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // Use provided ID or generate conversation ID
    let conversationId = id || `conv-${Date.now()}`;
    
    try {
      // Try to create the conversation
      await createConversationWithStringId(numericChildId, threadId, conversationId);
      
      const now = new Date().toISOString();
      
      res.status(201).json({
        id: conversationId,
        child_id: numericChildId,
        thread_id: threadId,
        started_at: now,
        last_activity_at: now
      });
    } catch (createError) {
      console.error('Failed to create conversation:', createError);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    next(error);
  }
});

// POST /api/conversations/:id/messages - Add a message to a conversation
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, content } = req.body;

    // Validate required fields
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    if (role !== 'user' && role !== 'assistant') {
      return res.status(400).json({ error: 'Role must be "user" or "assistant"' });
    }

    // Check if conversation exists with exact ID
    let convCheck = await db.execute({
      sql: 'SELECT child_id, id FROM conversations WHERE id = ?',
      args: [id]
    });
    
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.execute({
      sql: `
        INSERT INTO messages (id, conversation_id, role, content)
        VALUES (?, ?, ?, ?)
      `,
      args: [messageId, id, role, content]
    });

    // Update conversation last activity timestamp
    await db.execute({
      sql: `
        UPDATE conversations
        SET last_activity_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [id]
    });

    const now = new Date().toISOString();

    res.status(201).json({
      id: messageId,
      conversationId: id,
      role,
      content,
      timestamp: now
    });
  } catch (error) {
    console.error('Error adding message:', error);
    next(error);
  }
});

// GET /api/conversations/:id/latest - Get latest message from a conversation
router.get('/:id/latest', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.execute({
      sql: `
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `,
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No messages found in conversation' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting latest message:', error);
    next(error);
  }
});

// DELETE /api/conversations/:id - Delete a conversation
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if conversation exists
    const convCheck = await db.execute({
      sql: 'SELECT id FROM conversations WHERE id = ?',
      args: [id]
    });

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete conversation (cascading delete will remove messages)
    await db.execute({
      sql: 'DELETE FROM conversations WHERE id = ?',
      args: [id]
    });

    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    next(error);
  }
});

module.exports = router;
