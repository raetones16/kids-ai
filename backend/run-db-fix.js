#!/usr/bin/env node

/**
 * Run Parent-Child Relationship Database Fix
 * This script fixes child profile associations by ensuring
 * all children are properly linked to a parent account.
 * 
 * Usage: node run-db-fix.js
 */

const { fixChildParentRelationship } = require('./fix-parent-child-relationship');

console.log('Running parent-child relationship fix script...');

fixChildParentRelationship()
  .then(() => {
    console.log('✅ Parent-child relationship fix completed successfully');
    console.log('All child profiles should now be properly associated with parent accounts');
    console.log('You can now restart the server for changes to take effect');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error running parent-child relationship fix:', err);
    process.exit(1);
  });
