/**
 * Central Email Resolver — getMailSettings
 *
 * Call this from every email-sending function to get the correct
 * from/replyTo for a given company. Never hardcode senders anywhere else.
 *
 * Usage (from another backend function — inline this logic since no local imports):
 *   Copy the resolveMailSettings() helper below into each function that needs it.
 *
 * This file also exposes an HTTP endpoint for testing/admin purposes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PLATFORM_FROM = 'FieldFlow Pro <notifications@fieldflowpro.com>';
const PLATFORM_REPLY_TO = 'notifications@fieldflowpro.com';

export async function resolveMailSettings(base44, companyId) {
  if (!companyId) {
    return { error: 'No company_id provided', blocked: true };
  }

  const settings = await base44.asServiceRole.entities.CompanyEmailSettings.filter({ company_id: companyId });
  const cfg = settings[0];

  if (!cfg || !cfg.mail_enabled) {
    return { error: `Email not configured or disabled for company ${companyId}`, blocked: true };
  }

  if (cfg.mail_method === 'smtp') {
    if (!cfg.smtp_host || !cfg.smtp_username) {
      return { error: 'SMTP not fully configured', blocked: true };
    }
    return {
      from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`,
      replyTo: cfg.mail_reply_to || cfg.mail_from_address,
      method: 'smtp',
      fromName: cfg.mail_from_name,
      domain: cfg.mail_domain,
      verified: cfg.mail_domain_verified,
      enabled: true,
      fallbackUsed: false,
      smtpConfig: {
        host: cfg.smtp_host,
        port: cfg.smtp_port || 587,
        username: cfg.smtp_username,
        password: cfg.smtp_password,
        encryption: cfg.smtp_encryption || 'tls',
      }
    };
  }

  // Resend method
  if (cfg.mail_domain_verified) {
    return {
      from: `${cfg.mail_from_name} <${cfg.mail_from_address}>`,
      replyTo: cfg.mail_reply_to || cfg.mail_from_address,
      method: 'resend',
      fromName: cfg.mail_from_name,
      domain: cfg.mail_domain,
      verified: true,
      enabled: true,
      fallbackUsed: false,
    };
  }

  // Domain not verified
  if (cfg.mail_fallback_allowed) {
    console.warn(`[MailResolver] Company ${companyId} domain not verified — using platform fallback`);
    return {
      from: PLATFORM_FROM,
      replyTo: PLATFORM_REPLY_TO,
      method: 'resend',
      fromName: 'FieldFlow Pro',
      domain: 'fieldflowpro.com',
      verified: false,
      enabled: true,
      fallbackUsed: true,
    };
  }

  return { error: `Domain not verified and fallback not allowed for company ${companyId}`, blocked: true };
}

// HTTP endpoint for admin testing
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { company_id } = await req.json();
    const result = await resolveMailSettings(base44, company_id);
    return Response.json(result);
  } catch (error) {
    console.error('getMailSettings error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});