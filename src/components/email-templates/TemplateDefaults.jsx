export const TEMPLATE_CATEGORIES = {
  documents: {
    label: "Documents",
    color: "blue",
    types: ["estimate", "invoice"]
  },
  jobs: {
    label: "Jobs & Scheduling",
    color: "emerald",
    types: ["job_scheduled", "job_completed", "appointment_reminder"]
  },
  sales: {
    label: "Sales & Follow-Up",
    color: "purple",
    types: ["estimate_approved", "estimate_declined", "follow_up"]
  },
  payments: {
    label: "Payments",
    color: "amber",
    types: ["payment_received"]
  },
  custom: {
    label: "Custom",
    color: "slate",
    types: ["custom"]
  }
};

export const TEMPLATE_META = {
  estimate: {
    label: "Estimate Sent",
    description: "Sent to customers when an estimate is emailed",
    variables: ["{{customer_name}}", "{{estimate_number}}", "{{estimate_total}}", "{{estimate_link}}", "{{company_name}}"]
  },
  invoice: {
    label: "Invoice Sent",
    description: "Sent to customers when an invoice is emailed",
    variables: ["{{customer_name}}", "{{invoice_number}}", "{{invoice_total}}", "{{due_date}}", "{{pay_link}}", "{{company_name}}"]
  },
  job_scheduled: {
    label: "Job Scheduled",
    description: "Sent when a job is scheduled for a customer",
    variables: ["{{customer_name}}", "{{job_title}}", "{{scheduled_date}}", "{{scheduled_time}}", "{{address}}", "{{company_name}}"]
  },
  job_completed: {
    label: "Job Completed",
    description: "Sent when a job is marked as completed",
    variables: ["{{customer_name}}", "{{job_title}}", "{{company_name}}", "{{review_link}}"]
  },
  estimate_approved: {
    label: "Estimate Approved",
    description: "Internal notification when a customer approves an estimate",
    variables: ["{{customer_name}}", "{{estimate_number}}", "{{estimate_total}}", "{{company_name}}"]
  },
  estimate_declined: {
    label: "Estimate Declined",
    description: "Internal notification when a customer declines an estimate",
    variables: ["{{customer_name}}", "{{estimate_number}}", "{{company_name}}"]
  },
  payment_received: {
    label: "Payment Received",
    description: "Sent to customers when a payment is recorded",
    variables: ["{{customer_name}}", "{{amount_paid}}", "{{invoice_number}}", "{{company_name}}"]
  },
  appointment_reminder: {
    label: "Appointment Reminder",
    description: "Sent before a scheduled appointment",
    variables: ["{{customer_name}}", "{{job_title}}", "{{scheduled_date}}", "{{scheduled_time}}", "{{address}}", "{{company_name}}"]
  },
  follow_up: {
    label: "Follow-Up",
    description: "General follow-up message for unsent estimates or inactive customers",
    variables: ["{{customer_name}}", "{{company_name}}"]
  },
  custom: {
    label: "Custom Template",
    description: "A fully custom email template",
    variables: ["{{customer_name}}", "{{company_name}}"]
  }
};

export const DEFAULT_TEMPLATES = {
  estimate: {
    name: "Estimate Email",
    subject: "Your Estimate from {{company_name}} — #{{estimate_number}}",
    body_html: `<p>Hi {{customer_name}},</p>
<p>Thank you for reaching out! We've put together an estimate for your project. Please review the details below.</p>
<p><strong>Estimate #{{estimate_number}}</strong><br/>Total: {{estimate_total}}</p>
<p><a href="{{estimate_link}}" style="background:#3B82F6;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">View & Approve Estimate</a></p>
<p>If you have any questions, don't hesitate to reach out. We look forward to working with you!</p>
<p>Best regards,<br/>{{company_name}}</p>`
  },
  invoice: {
    name: "Invoice Email",
    subject: "Invoice #{{invoice_number}} from {{company_name}} — Due {{due_date}}",
    body_html: `<p>Hi {{customer_name}},</p>
<p>Thank you for choosing {{company_name}}! Please find your invoice details below.</p>
<p><strong>Invoice #{{invoice_number}}</strong><br/>Amount Due: {{invoice_total}}<br/>Due Date: {{due_date}}</p>
<p><a href="{{pay_link}}" style="background:#3B82F6;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">Pay Now</a></p>
<p>If you have any questions about this invoice, please contact us.</p>
<p>Thank you,<br/>{{company_name}}</p>`
  },
  job_scheduled: {
    name: "Job Scheduled",
    subject: "Your appointment is confirmed — {{job_title}}",
    body_html: `<p>Hi {{customer_name}},</p>
<p>Great news! Your appointment has been confirmed. Here are the details:</p>
<p><strong>Job:</strong> {{job_title}}<br/>
<strong>Date:</strong> {{scheduled_date}}<br/>
<strong>Time:</strong> {{scheduled_time}}<br/>
<strong>Address:</strong> {{address}}</p>
<p>Our team will arrive at the scheduled time. If you need to make any changes, please contact us as soon as possible.</p>
<p>See you soon!<br/>{{company_name}}</p>`
  },
  job_completed: {
    name: "Job Completed",
    subject: "Job Complete — How did we do?",
    body_html: `<p>Hi {{customer_name}},</p>
<p>We're glad to let you know that your job — <strong>{{job_title}}</strong> — has been completed!</p>
<p>We hope everything looks great. If you have a moment, we'd really appreciate a quick review — it helps us grow and serve more customers like you.</p>
<p><a href="{{review_link}}" style="background:#10B981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:12px 0;">Leave a Review</a></p>
<p>Thank you for trusting {{company_name}}!</p>`
  },
  appointment_reminder: {
    name: "Appointment Reminder",
    subject: "Reminder: Your appointment tomorrow — {{job_title}}",
    body_html: `<p>Hi {{customer_name}},</p>
<p>This is a friendly reminder about your upcoming appointment:</p>
<p><strong>Job:</strong> {{job_title}}<br/>
<strong>Date:</strong> {{scheduled_date}}<br/>
<strong>Time:</strong> {{scheduled_time}}<br/>
<strong>Address:</strong> {{address}}</p>
<p>If you need to reschedule or have any questions, please contact us right away.</p>
<p>See you soon!<br/>{{company_name}}</p>`
  },
  estimate_approved: {
    name: "Estimate Approved (Internal)",
    subject: "✅ Estimate #{{estimate_number}} Approved by {{customer_name}}",
    body_html: `<p>Good news! <strong>{{customer_name}}</strong> has approved Estimate <strong>#{{estimate_number}}</strong>.</p>
<p>Estimated Total: <strong>{{estimate_total}}</strong></p>
<p>Log in to {{company_name}}'s dashboard to schedule the job and create an invoice.</p>`
  },
  estimate_declined: {
    name: "Estimate Declined (Internal)",
    subject: "❌ Estimate #{{estimate_number}} Declined by {{customer_name}}",
    body_html: `<p>{{customer_name}} has declined Estimate <strong>#{{estimate_number}}</strong>.</p>
<p>You may want to follow up with them to understand their concerns and see if there's an opportunity to adjust the estimate.</p>`
  },
  payment_received: {
    name: "Payment Received",
    subject: "Payment Received — Thank You!",
    body_html: `<p>Hi {{customer_name}},</p>
<p>We've received your payment — thank you!</p>
<p><strong>Amount Paid:</strong> {{amount_paid}}<br/>
<strong>Invoice #:</strong> {{invoice_number}}</p>
<p>If you need a receipt or have any questions, feel free to reach out.</p>
<p>We appreciate your business!<br/>{{company_name}}</p>`
  },
  follow_up: {
    name: "Follow-Up",
    subject: "Following Up — {{company_name}}",
    body_html: `<p>Hi {{customer_name}},</p>
<p>We wanted to follow up and see if you had any questions or if there's anything we can help you with.</p>
<p>We'd love to earn your business and are happy to answer any questions.</p>
<p>Feel free to reply to this email or give us a call.</p>
<p>Best,<br/>{{company_name}}</p>`
  }
};