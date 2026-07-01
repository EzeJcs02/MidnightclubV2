#!/usr/bin/env node
/**
 * Migrate plaintext passwords to bcrypt hashes
 * Usage: node migrate-passwords.js
 *
 * This script:
 * 1. Reads plaintext passwords from access_password column
 * 2. Hashes them with bcrypt (matching Edge Function behavior)
 * 3. Stores in access_password_hash column
 * 4. Verifies migration success
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars required');
  console.error('   Set them in your .env file or as environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migratePasswords() {
  try {
    console.log('🔄 Starting password migration...\n');

    // 1. Get all members with plaintext passwords and no hash
    const { data: members, error: selectError } = await supabase
      .from('members')
      .select('id, member_id, nombre, access_password')
      .not('access_password', 'is', null)
      .is('access_password_hash', null);

    if (selectError) {
      throw new Error(`Failed to fetch members: ${selectError.message}`);
    }

    if (!members || members.length === 0) {
      console.log('✅ No members with plaintext passwords found');
      return;
    }

    console.log(`📝 Found ${members.length} members to migrate:\n`);

    let successCount = 0;
    let errorCount = 0;

    // 2. Migrate each password
    for (const member of members) {
      try {
        // Hash password (matching Edge Function: uppercase + bcrypt)
        const passwordToHash = (member.access_password || '').toString().toUpperCase();
        const hash = await bcrypt.hash(passwordToHash, 10);

        // Update with hash
        const { error: updateError } = await supabase
          .from('members')
          .update({ access_password_hash: hash })
          .eq('id', member.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`  ✅ ${member.member_id} (${member.nombre})`);
        successCount++;
      } catch (err) {
        console.error(`  ❌ ${member.member_id} - ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📈 Total: ${members.length}\n`);

    if (errorCount === 0) {
      console.log('🎉 Password migration completed successfully!');
      console.log('   All passwords have been hashed with bcrypt.\n');
    } else {
      console.log('⚠️  Migration completed with errors. Please review.\n');
      process.exit(1);
    }
  } catch (err) {
    console.error('💥 Fatal error:', err.message);
    process.exit(1);
  }
}

migratePasswords();
