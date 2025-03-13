const express = require('express');
const router = express.Router();
const { db } = require('../db');
const crypto = require('crypto');

// Helper to generate a unique conversation ID
function generateConversationId() {
  return `conv-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// Helper to generate a unique message ID
function generateMessageId() {
  return `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// GET /api/conversations/child/:childId - Get all conversations for a child
router.get('/child/:childId', async (req, res, next) => {
  try {
    const { childId } = req.params;
    console.log(`Fetching conversations for child ID: ${childId}`);

    // Check if child exists
    const childCheck = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [childId]
    });

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    console.log(`Searching database for child_id = ${childId}`);
    const result = await db.execute({
      sql: `
        SELECT * FROM conversations 
        WHERE child_id = ? 
        ORDER BY last_activity_at DESC
      `,
      args: [childId]
    });

    console.log(`Found ${result.rows.length} conversations for child ${childId}`);
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

    const result = await db.execute({
      sql: 'SELECT * FROM conversations WHERE id = ?',
      args: [id]
    });

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

    // Check if conversation exists
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

    // Check if child exists
    const childCheck = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [childId]
    });

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // Use provided ID or generate conversation ID
    const conversationId = id || generateConversationId();
    
    try {
      // Create the conversation
      await db.execute({
        sql: `
          INSERT INTO conversations (id, child_id, thread_id)
          VALUES (?, ?, ?)
        `,
        args: [conversationId, childId, threadId]
      });
      
      // Get the created conversation
      const result = await db.execute({
        sql: 'SELECT * FROM conversations WHERE id = ?',
        args: [conversationId]
      });
      
      res.status(201).json(result.rows[0]);
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

    // Check if conversation exists
    let convCheck = await db.execute({
      sql: 'SELECT child_id, id FROM conversations WHERE id = ?',
      args: [id]
    });
    
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add message
    const messageId = generateMessageId();
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

    // Get the created message
    const result = await db.execute({
      sql: 'SELECT * FROM messages WHERE id = ?',
      args: [messageId]
    });

    res.status(201).json(result.rows[0]);
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

    // Delete all messages for this conversation first
    await db.execute({
      sql: 'DELETE FROM messages WHERE conversation_id = ?',
      args: [id]
    });

    // Delete conversation
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
