const { db } = require('./db');

async function debugProfiles() {
  try {
    console.log('Reading all profiles from database...');
    const result = await db.execute('SELECT * FROM child_profiles');
    
    console.log('\nChild Profiles in Database:');
    console.log('==========================');
    
    if (result.rows.length === 0) {
      console.log('No profiles found in database');
    } else {
      result.rows.forEach(profile => {
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
    if (result.rows.length > 0) {
      console.log('\nUpdating profile with ID 1 to have correct DOB and custom instructions...');
      
      // Update profile with ID=1 to have correct DOB (James)
      await db.execute({
        sql: `UPDATE child_profiles 
              SET dob = '30/08/2020', 
                  custom_instructions = 'James loves dinosaurs and space exploration. He knows a lot about planets.'
              WHERE id = 1`,
      });
      
      // Update profile with ID=2 to have correct DOB (Oli)
      if (result.rows.length > 1) {
        await db.execute({
          sql: `UPDATE child_profiles 
                SET dob = '30/08/2020', 
                    custom_instructions = 'Oli enjoys playing minecraft and roblox games. He has a pet dog named Rex.'
                WHERE id = 2`,
        });
      }
      
      // Read profiles again to verify updates
      console.log('\nVerifying updates...');
      const updatedResult = await db.execute('SELECT * FROM child_profiles');
      
      updatedResult.rows.forEach(profile => {
        console.log(`\nProfile ID: ${profile.id}`);
        console.log(`Name: ${profile.name}`);
        console.log(`DOB: ${profile.dob}`);
        console.log(`Custom Instructions: ${profile.custom_instructions || 'None'}`);
      });
      
      console.log('\nProfiles updated successfully. Please restart the application to see the changes.');
    }
    
  } catch (error) {
    console.error('Error debugging profiles:', error);
  } finally {
    process.exit(0);
  }
}

// Run the debug function
debugProfiles();
