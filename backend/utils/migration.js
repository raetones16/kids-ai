const { db } = require('../db');

/**
 * Migration utility to transfer data from localStorage to database
 * This is meant to be called from a frontend endpoint during transition
 */
async function migrateDataFromLocalStorage(data) {
  try {
    console.log('Starting data migration from localStorage...');
    
    // 1. First, process child profiles
    if (data.profiles && Array.isArray(data.profiles)) {
      console.log(`Migrating ${data.profiles.length} child profiles...`);
      
      // Create a map from original profile IDs to new database IDs
      const profileMap = {};
      
      // Process each profile one by one
      for (const profile of data.profiles) {
        try {
          console.log(`Processing profile ${profile.name} (${profile.id})...`);
          
          // Insert the profile
          const result = await db.execute({
            sql: `
              INSERT INTO child_profiles (name, dob, color, custom_instructions)
              VALUES (?, ?, ?, ?)
            `,
            args: [
              profile.name,
              profile.dob || new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              profile.color || null,
              profile.customInstructions || null
            ]
          });
          
          // Get the new profile ID
          if (result.lastInsertRowid) {
            const newProfileId = Number(result.lastInsertRowid);
            profileMap[profile.id] = newProfileId;
            console.log(`Created profile for ${profile.name} with new ID: ${newProfileId}`);
          }
        } catch (err) {
          console.error(`Error creating profile for ${profile.name}:`, err);
        }
      }
      
      // 2. Now process conversations
      if (data.conversations && Array.isArray(data.conversations)) {
        console.log(`Migrating ${data.conversations.length} conversations...`);
        
        // Create a map from original conversation IDs to new database IDs
        const conversationMap = {};
        
        // Process each conversation
        for (const conversation of data.conversations) {
          try {
            // Get the mapped profile ID
            const newChildId = profileMap[conversation.childId];
            if (!newChildId) {
              console.log(`Skipping conversation ${conversation.id} - Child profile ${conversation.childId} not found in database`);
              continue;
            }
            
            // Insert the conversation
            const convResult = await db.execute({
              sql: `
                INSERT INTO conversations (child_id, thread_id)
                VALUES (?, ?)
              `,
              args: [
                newChildId,
                conversation.threadId || ''
              ]
            });
            
            // Get the new conversation ID
            if (convResult.lastInsertRowid) {
              const newConvId = Number(convResult.lastInsertRowid);
              conversationMap[conversation.id] = newConvId;
              console.log(`Created conversation with new ID: ${newConvId}`);
              
              // 3. Process messages for this conversation
              if (conversation.messages && Array.isArray(conversation.messages)) {
                console.log(`Migrating ${conversation.messages.length} messages for conversation...`);
                
                for (const message of conversation.messages) {
                  try {
                    // Insert the message
                    await db.execute({
                      sql: `
                        INSERT INTO messages (conversation_id, role, content)
                        VALUES (?, ?, ?)
                      `,
                      args: [
                        newConvId,
                        message.role || 'user',
                        message.content || ''
                      ]
                    });
                  } catch (msgErr) {
                    console.error(`Error creating message:`, msgErr);
                  }
                }
              }
            }
          } catch (convErr) {
            console.error(`Error creating conversation:`, convErr);
          }
        }
      }
      
      // 4. Process settings
      if (data.settings) {
        try {
          console.log('Migrating settings...');
          
          // Get parent PIN from settings
          const parentPin = data.settings.parentPin || '000000';
          
          // Clean up existing settings
          await db.execute('DELETE FROM settings WHERE id = 1');
          
          // Insert new settings
          await db.execute({
            sql: `
              INSERT INTO settings (id, parent_pin)
              VALUES (1, ?)
            `,
            args: [parentPin]
          });
          
          console.log('Settings migrated successfully');
        } catch (settingsErr) {
          console.error('Error migrating settings:', settingsErr);
        }
      }
      
      return {
        success: true,
        message: 'Migration completed with some possible issues - check server logs',
        profilesCount: Object.keys(profileMap).length,
        conversationsCount: data.conversations?.length || 0
      };
    } else {
      return {
        success: false,
        message: 'No profiles found to migrate'
      };
    }
  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      message: 'Migration failed: ' + error.message
    };
  }
}

module.exports = {
  migrateDataFromLocalStorage
};
