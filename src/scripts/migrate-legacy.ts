import { program } from 'commander';
import mysql from 'mysql2/promise';
import { db } from '../db';
import { leads, users, roles, legacyIdMappings } from '../db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

// Accumulators for report
const report = {
  discovered: 0,
  migrated: 0,
  skipped: 0,
  transformed: 0,
  failed: 0,
  duplicates: 0,
  warnings: [] as string[]
};

async function getLegacyConnection() {
  const url = process.env.LEGACY_DB_URL;
  if (!url) {
    throw new Error('LEGACY_DB_URL is not set. Cannot run migration.');
  }
  return await mysql.createConnection(url);
}

// Helper to track legacy mappings
async function mapLegacyId(legacyId: string, legacyType: string, newId: string) {
  await db.insert(legacyIdMappings).values({
    legacyId: String(legacyId),
    legacyType,
    newId,
  });
}

// 1. Users & Roles
async function migrateUsers(connection: mysql.Connection) {
  console.log('Migrating Users...');
  const [rows] = await connection.execute('SELECT * FROM users');
  const legacyUsers = rows as any[];
  report.discovered += legacyUsers.length;

  for (const legacyUser of legacyUsers) {
    try {
      // Create a default role if needed, or map properly
      // For simplicity, assigning default 'user' role
      const [role] = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
      
      const [newUser] = await db.insert(users).values({
        firstName: legacyUser.name || 'Unknown',
        email: legacyUser.email,
        passwordHash: 'migrated_no_password',
        roleId: role?.id || null, // Handle null gracefully
      }).returning();
      
      await mapLegacyId(legacyUser.id, 'user', newUser.id);
      report.migrated++;
    } catch (e: any) {
      report.failed++;
      report.warnings.push(`Failed to migrate user ${legacyUser.id}: ${e.message}`);
    }
  }
}

// 2. Leads (Flattening Persons and Orgs)
export function flattenLeadData(legacyLead: any, legacyPerson: any) {
  report.transformed++;
  
  // Transform status
  let status = 'new';
  if (legacyLead.status) {
    // Map Krayin statuses to our new normalized standard
    // (Assuming typical CRM status names)
    if (legacyLead.status === 'Won') status = 'won';
    else if (legacyLead.status === 'Lost') status = 'lost';
    else status = 'active';
  }

  const firstName = legacyPerson?.first_name || 'Unknown';
  const lastName = legacyPerson?.last_name || '';

  return {
    name: lastName ? `${firstName} ${lastName}` : firstName,
    email: legacyPerson?.emails ? JSON.parse(legacyPerson.emails)[0]?.value : null,
    phone: legacyPerson?.contact_numbers ? JSON.parse(legacyPerson.contact_numbers)[0]?.value : null,
    expectedValue: legacyLead.lead_value?.toString(),
    status,
    customData: {
      legacySourceId: legacyLead.lead_source_id,
      legacyPersonId: legacyLead.person_id,
    }
  };
}

async function migrateLeads(connection: mysql.Connection) {
  console.log('Migrating Leads...');
  const [leadRows] = await connection.execute('SELECT * FROM leads');
  const legacyLeads = leadRows as any[];
  
  const [personRows] = await connection.execute('SELECT * FROM persons');
  const legacyPersons = personRows as any[];
  const personMap = new Map(legacyPersons.map(p => [p.id, p]));

  report.discovered += legacyLeads.length;

  for (const legacyLead of legacyLeads) {
    try {
      const person = personMap.get(legacyLead.person_id);
      const flattened = flattenLeadData(legacyLead, person);
      
      // Deduplication check on email (simplified for this script)
      if (flattened.email) {
        const [existing] = await db.select().from(leads).where(eq(leads.email, flattened.email)).limit(1);
        if (existing) {
          report.duplicates++;
          report.skipped++;
          continue;
        }
      }

      const [newLead] = await db.insert(leads).values({
        organizationId: legacyLead.organization_id || '00000000-0000-0000-0000-000000000000',
        name: flattened.name,
        email: flattened.email,
        phone: flattened.phone,
        expectedValue: flattened.expectedValue,
        customData: flattened.customData,
        status: flattened.status as any,
      }).returning();
      
      await mapLegacyId(legacyLead.id, 'lead', newLead.id);
      report.migrated++;
    } catch (e: any) {
      report.failed++;
      report.warnings.push(`Failed to migrate lead ${legacyLead.id}: ${e.message}`);
    }
  }
}

async function runMigration() {
  console.log('Starting legacy data migration...');
  let connection;
  try {
    connection = await getLegacyConnection();
    
    // Step 1: Users
    await migrateUsers(connection);
    
    // Step 2: Leads (Simplified for core workflow)
    await migrateLeads(connection);

    // Save report
    const reportPath = path.join(process.cwd(), 'src/scripts/migration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Migration complete. Report saved to ${reportPath}`);
    console.log(report);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

program
  .name('migrate-legacy')
  .description('Migrate legacy Krayin CRM data to the new schema')
  .action(runMigration);

if (require.main === module) {
  program.parse();
}
