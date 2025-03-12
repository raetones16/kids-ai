const express = require('express');
const router = express.Router();
const { migrateDataFromLocalStorage } = require('../utils/migration');

// POST /api/migration/import - Import data from localStorage
router.post('/import', async (req, res, next) => {
  try {
    const data = req.body;
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    // Perform migration
    const result = await migrateDataFromLocalStorage(data);
    
    res.status(result.success ? 200 : 500).json({
      message: result.message || (result.success ? 'Data migration completed successfully' : 'Migration failed'),
      ...result
    });
  } catch (error) {
    console.error('Migration error:', error);
    next(error);
  }
});

module.exports = router;
