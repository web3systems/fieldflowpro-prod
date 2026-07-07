import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET"));
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const todayDate = () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoice_id = session.metadata?.invoice_id;
    const job_id = session.metadata?.job_id;
    const isDeposit = session.metadata?.deposit === 'true';
    const sessionId = session.id;
    const sessionAmount = (session.amount_total || 0) / 100;
    const paidDate = todayDate();

    // Deduplicate: check if we already recorded this Stripe session
    try {
      const existing = await base44.asServiceRole.entities.Payment.filter({ stripe_session_id: sessionId });
      if (existing.length > 0) {
        console.log(`Stripe session ${sessionId} already recorded — skipping duplicate webhook.`);
        return Response.json({ received: true });
      }
    } catch (err) {
      console.error("Dedup check failed:", err.message);
    }

    // Handle job deposit payment (from payment link created by requestDeposit — no invoice_id)
    if (job_id && isDeposit && !invoice_id) {
      try {
        await base44.asServiceRole.entities.Job.update(job_id, {
          deposit_status: 'paid',
          deposit_paid_date: paidDate,
          deposit_payment_intent_id: session.payment_intent || '',
        });

        // Find company_id from job for the Payment record
        const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
        const job = jobs[0];
        if (job) {
          await base44.asServiceRole.entities.Payment.create({
            company_id: job.company_id,
            job_id: job_id,
            invoice_id: "",
            amount: sessionAmount,
            payment_method: "stripe",
            payment_type: "deposit",
            received_date: paidDate,
            notes: `Stripe deposit — session ${sessionId}`,
            recorded_by: "Stripe Webhook",
            stripe_session_id: sessionId,
          });
          console.log(`Job ${job_id} deposit of $${sessionAmount} recorded via Payment ledger.`);
        }
      } catch (err) {
        console.error("Failed to update job deposit:", err.message);
      }
      return Response.json({ received: true });
    }

    // Handle invoice payment (full or partial/deposit against an invoice)
    if (invoice_id) {
      try {
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
        const invoice = invoices[0];
        if (!invoice) {
          console.error(`Invoice ${invoice_id} not found`);
          return Response.json({ received: true });
        }

        // Create Payment ledger record
        await base44.asServiceRole.entities.Payment.create({
          company_id: invoice.company_id,
          job_id: invoice.job_id || "",
          invoice_id: invoice_id,
          amount: sessionAmount,
          payment_method: "stripe",
          payment_type: isDeposit ? "deposit" : "final",
          received_date: paidDate,
          notes: `Stripe payment — session ${sessionId}`,
          recorded_by: "Stripe Webhook",
          stripe_session_id: sessionId,
        });

        // Recalculate total paid from all Payment records for this invoice
        const allPayments = await base44.asServiceRole.entities.Payment.filter({ invoice_id: invoice_id });
        const totalPaid = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
        const newStatus = totalPaid >= (invoice.total || 0) ? "paid" : "partial";

        await base44.asServiceRole.entities.Invoice.update(invoice_id, {
          amount_paid: totalPaid,
          status: newStatus,
          payment_method: "stripe",
          ...(newStatus === "paid" ? { paid_date: paidDate } : {}),
        });

        console.log(`Invoice ${invoice_id}: $${sessionAmount} recorded. Total paid: $${totalPaid}. Status: ${newStatus}`);
      } catch (err) {
        console.error("Failed to record invoice payment:", err.message);
      }
    }
  }

  return Response.json({ received: true });
});