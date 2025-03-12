const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/profiles - Get all child profiles
router.get('/', async (req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM child_profiles');
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting profiles:', error);
    next(error);
  }
});

// GET /api/profiles/:id - Get a specific child profile
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await db.execute({
      sql: 'SELECT * FROM child_profiles WHERE id = ?',
      args: [id]
    });

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
    
    // Create profile
    const result = await db.execute({
      sql: `
        INSERT INTO child_profiles (name, dob, color, custom_instructions)
        VALUES (?, ?, ?, ?)
      `,
      args: [name, dob, color || null, customInstructions || null]
    });

    // Return the created profile with ID
    const profileId = result.lastInsertRowid.toString();
    res.status(201).json({
      id: profileId,
      name,
      dob,
      color,
      customInstructions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating profile:', error);
    next(error);
  }
});

// PUT /api/profiles/:id - Update a child profile
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, dob, color, customInstructions } = req.body;

    // Check if profile exists
    const checkResult = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [id]
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile
    await db.execute({
      sql: `
        UPDATE child_profiles 
        SET name = ?, dob = ?, color = ?, custom_instructions = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [name, dob, color, customInstructions, id]
    });

    // Get updated profile
    const result = await db.execute({
      sql: 'SELECT * FROM child_profiles WHERE id = ?',
      args: [id]
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    next(error);
  }
});

// DELETE /api/profiles/:id - Delete a child profile
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if profile exists
    const checkResult = await db.execute({
      sql: 'SELECT id FROM child_profiles WHERE id = ?',
      args: [id]
    });

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Delete profile (cascading delete will remove conversations and messages)
    await db.execute({
      sql: 'DELETE FROM child_profiles WHERE id = ?',
      args: [id]
    });

    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    next(error);
  }
});

module.exports = router;
