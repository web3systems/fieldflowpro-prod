import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getSenderForCompany(company) {
  const name = (company?.name || '').toLowerCase();
  const slug = (company?.slug || '').toLowerCase();
  if (name.includes('pretty little') || slug.includes('pretty')) {
    return `${company.name} <notifications@prettylittlepolishers.com>`;
  }
  if (name.includes('honeydo clean') || slug.includes('honeydoclean')) {
    return `${company.name} <notifications@honeydoclean.com>`;
  }
  return `${company?.name || 'Honeydo Crew'} <notifications@honeydocrew.co>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id } = await req.json();

    const jobs = await base44.entities.Job.filter({ id: job_id });
    if (!jobs[0]) return Response.json({ error: 'Job not found' }, { status: 404 });
    const job = jobs[0];

    if (user.role !== 'admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: user.email,
        company_id: job.company_id
      });
      if (access.length === 0) return Response.json({ error: 'Forbidden: No access to this company' }, { status: 403 });
    }

    const customers = await base44.entities.Customer.filter({ id: job.customer_id });
    if (!customers[0] || !customers[0].email) {
      return Response.json({ error: 'Customer email not found' }, { status: 400 });
    }
    const customer = customers[0];

    const companies = await base44.entities.Company.filter({ id: job.company_id });
    const company = companies[0];
    const fromAddress = getSenderForCompany(company);
    const reviewUrl = company?.google_review_url;

    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <p style="color:#475569;">Hi ${customer.first_name},</p>
      <p style="color:#475569;">Thank you for choosing <strong>${company?.name || 'us'}</strong> for your recent service: <em>${job.title}</em>.</p>
      <p style="color:#475569;">We hope everything went smoothly! Your feedback means the world to us.</p>
      ${reviewUrl
        ? `<div style="margin:28px 0;text-align:center;">
            <a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Leave a Review ⭐</a>
           </div>`
        : `<p style="color:#475569;">Please don't hesitate to reach out with any feedback — we truly appreciate it!</p>`
      }
      <p style="color:#475569;">Thank you for being a valued customer!</p>
      <p style="color:#374151;font-weight:600;">${company?.name || 'The Team'}</p>
      ${company?.phone ? `<p style="color:#64748b;font-size:14px;">📞 ${company.phone}</p>` : ''}
    </div>`;

    await resend.emails.send({
      from: fromAddress,
      to: customer.email,
      subject: `How was your service with ${company?.name || 'us'}?`,
      html,
    });

    console.log(`Review request sent to ${customer.email} from ${fromAddress} for job ${job_id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendReviewRequest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});