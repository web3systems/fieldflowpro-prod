import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id } = await req.json();

    const jobs = await base44.entities.Job.filter({ id: job_id });
    if (!jobs[0]) return Response.json({ error: 'Job not found' }, { status: 404 });
    const job = jobs[0];

    // Verify user has access to this job's company
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
    const reviewUrl = company?.google_review_url;

    const body = `Hi ${customer.first_name},

Thank you for choosing ${company?.name || 'us'} for your recent service: "${job.title}".

We hope everything went smoothly! Your feedback means the world to us and helps us continue to improve.

${reviewUrl
  ? `We'd love it if you could take a moment to leave us a review:\n${reviewUrl}`
  : 'Please don\'t hesitate to reach out with any feedback — we truly appreciate it!'
}

Thank you for being a valued customer!

${company?.name || 'The Team'}
${company?.phone ? `\nPhone: ${company.phone}` : ''}`;

    await base44.integrations.Core.SendEmail({
      to: customer.email,
      subject: `How was your service with ${company?.name || 'us'}?`,
      body
    });

    console.log(`Review request sent to ${customer.email} for job ${job_id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendReviewRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});