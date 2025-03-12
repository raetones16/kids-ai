const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/settings - Get application settings
router.get('/', async (req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM settings WHERE id = 1');
    
    if (result.rows.length === 0) {
      // Initialize with defaults if no settings exist
      await db.execute(`
        INSERT INTO settings (id, parent_pin) 
        VALUES (1, '000000')
      `);
      
      return res.json({
        parentPin: '000000',
        updatedAt: new Date().toISOString()
      });
    }
    
    res.json({
      parentPin: result.rows[0].parent_pin,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    next(error);
  }
});

// PUT /api/settings/pin - Update parent PIN
router.put('/pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    
    // Validate PIN format
    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be a 6-digit number' });
    }
    
    // Update PIN
    await db.execute({
      sql: `
        UPDATE settings 
        SET parent_pin = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `,
      args: [pin]
    });
    
    res.json({
      message: 'PIN updated successfully',
      parentPin: pin,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating PIN:', error);
    next(error);
  }
});

// POST /api/settings/verify-pin - Verify parent PIN
router.post('/verify-pin', async (req, res, next) => {
  try {
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }
    
    try {
      // First, check if settings table exists
      const checkResult = await db.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='settings'
      `);

      if (checkResult.rows.length === 0) {
        console.log('Settings table does not exist, initializing...');
        
        // Create table if it doesn't exist
        await db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            parent_pin TEXT NOT NULL DEFAULT '000000',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Insert default data
        await db.execute(`
          INSERT OR IGNORE INTO settings (id, parent_pin)
          VALUES (1, '000000')
        `);
        
        // Default PIN is valid
        return res.json({ valid: pin === '000000' });
      }
      
      // Get the current PIN
      const result = await db.execute({
        sql: 'SELECT parent_pin FROM settings WHERE id = 1'
      });
      
      if (result.rows.length === 0) {
        // Insert default settings if not present
        await db.execute(`
          INSERT INTO settings (id, parent_pin)
          VALUES (1, '000000')
        `);
        
        // Default PIN is valid
        return res.json({ valid: pin === '000000' });
      }
      
      // Compare the provided PIN with the stored PIN
      const isValid = pin === result.rows[0].parent_pin;
      res.json({ valid: isValid });
    } catch (dbError) {
      console.error('Database error when verifying PIN:', dbError);
      // Fallback to default PIN
      return res.json({ valid: pin === '000000' });
    }
  } catch (error) {
    console.error('Error verifying PIN:', error);
    next(error);
  }
});

module.exports = router;
