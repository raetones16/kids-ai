const { db } = require('./db');

async function fixProfiles() {
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
      console.log('\nUpdating profiles with correct format...');
      
      // Find James profile
      const jamesProfile = result.rows.find(p => p.name === 'James');
      // Find Oli profile
      const oliProfile = result.rows.find(p => p.name === 'Oli');
      
      if (jamesProfile) {
        console.log(`Updating profile for James (ID: ${jamesProfile.id})...`);
        
        // Ensure correct format for James DOB (30/08/2016)
        // Update custom instructions to be complete
        const jamesCustomInstructions = 
          "James loves fortnite and playing with his friends. He is good at math. His dad is Tim and mum Karolina and he lives in York UK.";
        
        // Update profile
        await db.execute({
          sql: `UPDATE child_profiles 
                SET dob = '30/08/2016', 
                    custom_instructions = ?
                WHERE id = ?`,
          args: [jamesCustomInstructions, jamesProfile.id]
        });
        
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
        await db.execute({
          sql: `UPDATE child_profiles 
                SET dob = '30/08/2020', 
                    custom_instructions = ?
                WHERE id = ?`,
          args: [oliCustomInstructions, oliProfile.id]
        });
        
        console.log('Oli profile updated successfully');
      } else {
        console.log('Oli profile not found');
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
    console.error('Error fixing profiles:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix function
fixProfiles();
