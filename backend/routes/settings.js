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
      // First, check if settings table exists and has data
      const verifyQuery = `
        SELECT parent_pin FROM settings WHERE id = 1 LIMIT 1
      `;
      
      // Try to get the PIN directly first
      try {
        const pinResult = await db.execute(verifyQuery);
        
        if (pinResult && pinResult.rows && pinResult.rows.length > 0) {
          // We have a valid PIN, compare it
          const storedPin = pinResult.rows[0].parent_pin || '000000';
          return res.json({ valid: pin === storedPin });
        }
      } catch (directQueryError) {
        console.warn('Direct PIN query failed, trying table check:', directQueryError);
        // Continue to table check
      }
      
      // If direct query failed, check if table exists
      const checkResult = await db.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='settings'
      `).catch(err => {
        console.error('Error checking settings table:', err);
        return { rows: [] };
      });

      if (!checkResult || !checkResult.rows || checkResult.rows.length === 0) {
        console.log('Settings table does not exist, initializing...');
        
        try {
          // Create table if it doesn't exist
          await db.execute(`
            CREATE TABLE IF NOT EXISTS settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              parent_pin TEXT NOT NULL DEFAULT '000000',
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Insert default data - use INSERT OR REPLACE to avoid constraint errors
          await db.execute(`
            INSERT OR REPLACE INTO settings (id, parent_pin)
            VALUES (1, '000000')
          `);
        } catch (initError) {
          console.error('Error initializing settings table:', initError);
        }
        
        // Default PIN is valid
        return res.json({ valid: pin === '000000' });
      }
      
      // Get the current PIN
      try {
        const result = await db.execute(verifyQuery);
        
        if (result && result.rows && result.rows.length > 0) {
          // Compare the provided PIN with the stored PIN
          const storedPin = result.rows[0].parent_pin || '000000';
          return res.json({ valid: pin === storedPin });
        } else {
          // No settings row found, try to insert one
          try {
            // Use INSERT OR REPLACE to avoid constraint errors
            await db.execute(`
              INSERT OR REPLACE INTO settings (id, parent_pin)
              VALUES (1, '000000')
            `);
          } catch (insertError) {
            console.error('Error inserting default settings:', insertError);
          }
          
          // Default PIN is valid
          return res.json({ valid: pin === '000000' });
        }
      } catch (getError) {
        console.error('Error getting settings row:', getError);
        // Fallback to default PIN
        return res.json({ valid: pin === '000000' });
      }
    } catch (dbError) {
      console.error('Database error when verifying PIN:', dbError);
      // Fallback to default PIN
      return res.json({ valid: pin === '000000' });
    }
  } catch (error) {
    console.error('Error verifying PIN:', error);
    // Always respond, even on error
    return res.status(500).json({ valid: false, error: 'Server error' });
  }
});

module.exports = router;
