const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Function to fix profiles
async function fixProfiles() {
  // Create a database connection directly to SQLite (not using libsql)
  const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
      process.exit(1);
    }
    console.log('Connected to database.sqlite');
  });

  // Promisify database operations
  const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const exec = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  };

  try {
    console.log('Reading all profiles from database...');
    const profiles = await query('SELECT * FROM child_profiles');
    
    console.log('\nChild Profiles in Database:');
    console.log('==========================');
    
    if (profiles.length === 0) {
      console.log('No profiles found in database');
    } else {
      profiles.forEach(profile => {
        console.log(`\nProfile ID: ${profile.id}`);
        console.log(`Name: ${profile.name}`);
        console.log(`DOB: ${profile.dob}`);
        console.log(`Color: ${profile.color || 'Not set'}`);
        console.log(`Custom Instructions: ${profile.custom_instructions || 'None'}`);
        console.log(`Created: ${profile.created_at}`);
        console.log(`Updated: ${profile.updated_at}`);
        console.log('---------------------------');
      });
    }
    
    // Check if we can update the profiles
    if (profiles.length > 0) {
      console.log('\nUpdating profiles with correct format...');
      
      // Find James profile
      const jamesProfile = profiles.find(p => p.name === 'James');
      // Find Oli profile
      const oliProfile = profiles.find(p => p.name === 'Oli');
      
      if (jamesProfile) {
        console.log(`Updating profile for James (ID: ${jamesProfile.id})...`);
        
        // Ensure correct format for James DOB (30/08/2016)
        // Update custom instructions to be complete
        const jamesCustomInstructions = 
          "James loves fortnite and playing with his friends. He is good at math. His dad is Tim and mum Karolina and he lives in York UK.";
        
        // Update profile
        await exec(
          `UPDATE child_profiles 
           SET dob = '30/08/2016', 
               custom_instructions = ?
           WHERE id = ?`,
          [jamesCustomInstructions, jamesProfile.id]
        );
        
        console.log('James profile updated successfully');
      } else {
        console.log('James profile not found');
      }
      
      if (oliProfile) {
        console.log(`Updating profile for Oli (ID: ${oliProfile.id})...`);
        
        // Ensure correct format for Oli DOB (30/08/2020)
        // Update custom instructions to be complete
        const oliCustomInstructions = 
          "Oli loves science, making things, watching youtube and learning. His dad is Tim and mum Karolina and he lives in York UK.";
        
        // Update profile
        await exec(
          `UPDATE child_profiles 
           SET dob = '30/08/2020', 
               custom_instructions = ?
           WHERE id = ?`,
          [oliCustomInstructions, oliProfile.id]
        );
        
        console.log('Oli profile updated successfully');
      } else {
        console.log('Oli profile not found');
      }
      
      // Read profiles again to verify updates
      console.log('\nVerifying updates...');
      const updatedProfiles = await query('SELECT * FROM child_profiles');
      
      updatedProfiles.forEach(profile => {
        console.log(`\nProfile ID: ${profile.id}`);
        console.log(`Name: ${profile.name}`);
        console.log(`DOB: ${profile.dob}`);
        console.log(`Custom Instructions: ${profile.custom_instructions || 'None'}`);
      });
      
      console.log('\nProfiles updated successfully. Please restart the application to see the changes.');
    }
    
  } catch (error) {
    console.error('Error fixing profiles:', error);
  } finally {
    // Close the database connection
    db.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the fix function
fixProfiles();
