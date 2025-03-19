// fix-parent-child-relationship.js
const { db } = require('./db');

async function fixChildParentRelationship() {
  try {
    console.log('Starting database schema update for parent-child relationship...');
    
    // 1. First check if parent_id column already exists
    const tableInfo = await db.execute(`PRAGMA table_info(child_profiles)`);
    const hasParentIdColumn = tableInfo.rows.some(row => row.name === 'parent_id');
    
    if (!hasParentIdColumn) {
      console.log('Adding parent_id column to child_profiles table...');
      
      // 2. Add parent_id column to child_profiles table
      await db.execute(`
        ALTER TABLE child_profiles 
        ADD COLUMN parent_id TEXT REFERENCES parent_profiles(id) ON DELETE CASCADE
      `);
      
      console.log('parent_id column added successfully');
      
      // 3. Create an index on parent_id for faster lookups
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id
        ON child_profiles(parent_id)
      `);
      
      console.log('Created index on parent_id column');
    } else {
      console.log('parent_id column already exists in child_profiles table');
    }
    
    // 4. Retrieve all parent profiles to assign to children
    const parents = await db.execute('SELECT id FROM parent_profiles');
    
    if (parents.rows.length === 0) {
      console.warn('No parent profiles found. Cannot assign children to parents.');
      return;
    }
    
    // Get the first parent ID (or default 'parent' ID for the default account)
    const defaultParentId = parents.rows[0].id || 'parent';
    
    // 5. Update all existing child profiles to belong to the first parent
    // This is a temporary solution to ensure all profiles have a parent
    console.log(`Assigning all existing child profiles to parent ID: ${defaultParentId}`);
    
    await db.execute({
      sql: `
        UPDATE child_profiles
        SET parent_id = ?
        WHERE parent_id IS NULL
      `,
      args: [defaultParentId]
    });
    
    console.log('Database schema updated successfully!');
    console.log('All existing child profiles are now associated with a parent');
    
  } catch (error) {
    console.error('Error updating database schema:', error);
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  fixChildParentRelationship()
    .then(() => console.log('Schema update script completed'))
    .catch(err => console.error('Schema update script failed:', err))
    .finally(() => process.exit());
}

module.exports = { fixChildParentRelationship };
