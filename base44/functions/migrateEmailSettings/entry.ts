/**
 * One-time migration: seeds CompanyEmailSettings for existing companies.
 * Run once as admin from the dashboard → functions.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MIGRATIONS = [
  {
    name_includes: 'pretty little',
    mail_from_address: 'notifications@prettylittlepolishers.com',
    mail_reply_to: 'office@prettylittlepolishers.com',
    mail_domain: 'prettylittlepolishers.com',
  },
  {
    name_includes: 'honeydo clean',
    mail_from_address: 'notifications@honeydoclean.com',
    mail_reply_to: 'office@honeydoclean.com',
    mail_domain: 'honeydoclean.com',
  },
  {
    name_includes: 'honeydo crew',
    mail_from_address: 'notifications@honeydocrew.co',
    mail_reply_to: 'office@honeydocrew.co',
    mail_domain: 'honeydocrew.co',
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const companies = await base44.asServiceRole.entities.Company.list();
    const results = [];

    for (const company of companies) {
      const nameLower = (company.name || '').toLowerCase();
      const migration = MIGRATIONS.find(m => nameLower.includes(m.name_includes));

      if (!migration) {
        results.push({ company: company.name, status: 'skipped — no migration rule' });
        continue;
      }

      // Check if already exists
      const existing = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: company.id });
      if (existing.length > 0) {
        results.push({ company: company.name, status: 'already exists — skipped' });
        continue;
      }

      await base44.asServiceRole.entities.CompanyEmailSettings.create({
        company_id: company.id,
        mail_enabled: true,
        mail_method: 'resend',
        mail_from_name: company.name,
        mail_from_address: migration.mail_from_address,
        mail_reply_to: migration.mail_reply_to,
        mail_domain: migration.mail_domain,
        mail_domain_verified: true,
        mail_fallback_allowed: true,
      });

      results.push({ company: company.name, status: 'migrated', from: migration.mail_from_address });
    }

    console.log('Migration complete:', JSON.stringify(results, null, 2));
    return Response.json({ success: true, results });
  } catch (error) {
    console.error('migrateEmailSettings error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});