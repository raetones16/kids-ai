const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/stats/child/:childId - Get usage statistics for a child
router.get('/child/:childId', async (req, res, next) => {
  try {
    const { childId } = req.params;

    // Check if child exists
    const childCheck = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [childId]
    });

    if (childCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // Get total conversations
    const conversationsResult = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM conversations WHERE child_id = ?',
      args: [childId]
    });
    const totalConversations = conversationsResult.rows[0].total;

    // Get total messages
    const messagesResult = await db.execute({
      sql: `
        SELECT COUNT(*) as total FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.child_id = ?
      `,
      args: [childId]
    });
    const totalMessages = messagesResult.rows[0].total;

    // Get user messages (child messages)
    const userMessagesResult = await db.execute({
      sql: `
        SELECT COUNT(*) as total FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.child_id = ? AND m.role = 'user'
      `,
      args: [childId]
    });
    const totalUserMessages = userMessagesResult.rows[0].total;

    // Calculate average messages per conversation
    let averageMessagesPerConversation = '0';
    if (totalConversations > 0) {
      averageMessagesPerConversation = (totalMessages / totalConversations).toFixed(1);
    }

    // Return the stats
    res.json({
      totalConversations,
      totalMessages,
      totalUserMessages,
      totalAssistantMessages: totalMessages - totalUserMessages,
      averageMessagesPerConversation
    });
  } catch (error) {
    console.error('Error getting child stats:', error);
    next(error);
  }
});

module.exports = router;
