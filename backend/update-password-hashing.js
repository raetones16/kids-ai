// Script to update password hashing and add a second parent account
const bcrypt = require('bcrypt');
const { db } = require('./db');

// Configuration
const SALT_ROUNDS = 10;
const SECOND_PARENT = {
  id: 'parent2',
  username: 'parent2',  // Change this to your desired username
  password: 'password456'  // Change this to your desired password
};

async function updatePasswordHashing() {
  try {
    console.log('Starting password hashing migration...');
    
    // 1. Check if bcrypt is installed
    if (!bcrypt) {
      console.error('Error: bcrypt package is not installed. Please run: npm install bcrypt');
      return;
    }

    // 2. Get all parent profiles
    const profiles = await db.execute('SELECT id, username, password FROM parent_profiles');
    
    if (profiles.rows.length === 0) {
      console.log('No parent profiles found. Creating default parent with hashed password...');
      
      // Hash the default password
      const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);
      
      // Insert default parent with hashed password
      await db.execute({
        sql: 'INSERT INTO parent_profiles (id, username, password) VALUES (?, ?, ?)',
        args: ['parent', 'parent', hashedPassword]
      });
      
      console.log('Created default parent account with hashed password');
    } else {
      console.log(`Found ${profiles.rows.length} parent profile(s). Updating passwords...`);
      
      // Update each profile with hashed password
      for (const profile of profiles.rows) {
        const hashedPassword = await bcrypt.hash(profile.password, SALT_ROUNDS);
        
        await db.execute({
          sql: 'UPDATE parent_profiles SET password = ? WHERE id = ?',
          args: [hashedPassword, profile.id]
        });
        
        console.log(`Updated password for ${profile.username}`);
      }
    }
    
    // 3. Add second parent account if requested
    const existingSecondParent = await db.execute({
      sql: 'SELECT id FROM parent_profiles WHERE id = ?',
      args: [SECOND_PARENT.id]
    });
    
    if (existingSecondParent.rows.length === 0) {
      console.log(`Creating second parent account (${SECOND_PARENT.username})...`);
      
      // Hash the password for the second parent
      const hashedPassword = await bcrypt.hash(SECOND_PARENT.password, SALT_ROUNDS);
      
      // Insert the second parent with hashed password
      await db.execute({
        sql: 'INSERT INTO parent_profiles (id, username, password, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        args: [SECOND_PARENT.id, SECOND_PARENT.username, hashedPassword]
      });
      
      console.log(`Second parent account created successfully: ${SECOND_PARENT.username}`);
    } else {
      console.log(`Second parent account (${SECOND_PARENT.id}) already exists.`);
    }
    
    console.log('Password hashing migration completed successfully.');
  } catch (error) {
    console.error('Error updating password hashing:', error);
  }
}

// Run the migration
updatePasswordHashing()
  .then(() => console.log('Script completed.'))
  .catch(err => console.error('Script failed:', err))
  .finally(() => process.exit());
