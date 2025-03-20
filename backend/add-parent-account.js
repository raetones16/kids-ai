// Script to add a new parent account
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SALT_ROUNDS = 10;

async function addParentAccount() {
  try {
    console.log('=== Add New Parent Account ===');
    
    // Get account details from user input
    const id = await new Promise(resolve => {
      rl.question('Enter account ID (e.g., parent2): ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (!id) {
      console.error('Error: ID cannot be empty');
      return;
    }
    
    // Check if ID already exists
    const existingAccount = await db.execute({
      sql: 'SELECT id FROM parent_profiles WHERE id = ?',
      args: [id]
    });
    
    if (existingAccount.rows.length > 0) {
      console.error(`Error: An account with ID "${id}" already exists`);
      return;
    }
    
    const username = await new Promise(resolve => {
      rl.question('Enter username: ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (!username) {
      console.error('Error: Username cannot be empty');
      return;
    }
    
    // Check if username already exists
    const existingUsername = await db.execute({
      sql: 'SELECT id FROM parent_profiles WHERE username = ?',
      args: [username]
    });
    
    if (existingUsername.rows.length > 0) {
      console.error(`Error: Username "${username}" is already taken`);
      return;
    }
    
    const password = await new Promise(resolve => {
      rl.question('Enter password: ', answer => {
        resolve(answer.trim());
      });
    });
    
    if (!password || password.length < 6) {
      console.error('Error: Password must be at least 6 characters');
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create the new account
    await db.execute({
      sql: 'INSERT INTO parent_profiles (id, username, password, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      args: [id, username, hashedPassword]
    });
    
    console.log(`Success! Parent account "${username}" created successfully.`);
  } catch (error) {
    console.error('Error adding parent account:', error);
  } finally {
    rl.close();
  }
}

// Run the script
addParentAccount();
