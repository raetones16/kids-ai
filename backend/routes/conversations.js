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

// GET /api/conversations/child/:childId - Get all conversations for a child (with pagination)
router.get('/child/:childId', async (req, res, next) => {
  try {
    const { childId } = req.params;
    
    // Debug the raw query parameters
    console.log('Raw query parameters:', req.query);
    console.log('Raw page param:', req.query.page, 'Type:', typeof req.query.page);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    console.log(`Fetching conversations for child ID: ${childId}, parsed page: ${page}, limit: ${limit}, offset: ${offset}`);

    // Check if child exists
    const childCheck = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [childId]
    });

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }
    
    // Get total count for pagination info
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM conversations WHERE child_id = ?',
      args: [childId]
    });
    
    const total = countResult.rows[0].total;
    
    // Force pagination values to be numbers to avoid type issues
    const numPage = Number(page);
    const numLimit = Number(limit);
    const numOffset = (numPage - 1) * numLimit;

    console.log(`Using NUMERIC offset: ${numOffset} for page ${numPage} with limit ${numLimit}`);
    
    // Get conversations with metadata - first message and message count
    const result = await db.execute({
      sql: `
        SELECT 
          c.id, 
          c.child_id, 
          c.thread_id, 
          c.started_at, 
          c.last_activity_at,
          (
            SELECT COUNT(*) 
            FROM messages 
            WHERE conversation_id = c.id
          ) as message_count,
          (
            SELECT content
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY timestamp ASC
            LIMIT 1
          ) as first_message_content
        FROM conversations c
        WHERE c.child_id = ? 
        ORDER BY c.last_activity_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [childId, numLimit, numOffset]
    });

    console.log(`Found ${result.rows.length} conversations for child ${childId} (page ${numPage} of ${Math.ceil(total/numLimit)})`);
    if (result.rows.length > 0) {
      console.log(`First conversation ID on this page:`, result.rows[0].id);
      console.log(`Last conversation ID on this page:`, result.rows[result.rows.length-1].id);
    }
    
    // Return both the conversations and pagination info
    const responseData = {
      conversations: result.rows,
      pagination: {
        total,
        page: numPage,
        limit: numLimit,
        pages: Math.ceil(total / numLimit),
        offset: numOffset
      }
    };
    
    // Log the response data structure
    console.log(`Sending response with ${result.rows.length} conversations. Sample conversation:`, 
                result.rows.length > 0 ? { id: result.rows[0].id, child_id: result.rows[0].child_id, message_count: result.rows[0].message_count } : 'No conversations');
    
    res.json(responseData);
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
