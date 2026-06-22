import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Helper: today's date as YYYY-MM-DD
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

    // Handle job deposit payment (from payment link created by requestDeposit)
    if (job_id && isDeposit) {
      try {
        await base44.asServiceRole.entities.Job.update(job_id, {
          deposit_status: 'paid',
          deposit_paid_date: todayDate(),
          deposit_payment_intent_id: session.payment_intent || '',
        });
        console.log(`Job ${job_id} deposit marked as paid via Stripe checkout.session.completed`);
      } catch (err) {
        console.error("Failed to update job deposit status:", err.message);
      }
      return Response.json({ received: true });
    }

    // Handle regular invoice payment
    if (invoice_id) {
      try {
        const paid_date = todayDate();
        const sessionAmount = (session.amount_total || 0) / 100;

        if (isDeposit) {
          const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
          const invoice = invoices[0];
          if (!invoice) {
            console.error(`Invoice ${invoice_id} not found for deposit webhook`);
            return Response.json({ received: true });
          }
          const newAmountPaid = (invoice.amount_paid || 0) + sessionAmount;
          const newStatus = newAmountPaid >= invoice.total ? "paid" : "partial";
          await base44.asServiceRole.entities.Invoice.update(invoice_id, {
            amount_paid: newAmountPaid,
            status: newStatus,
            payment_method: "stripe",
            ...(newStatus === "paid" ? { paid_date } : {}),
          });
          console.log(`Deposit of $${sessionAmount} recorded on invoice ${invoice_id}. Status: ${newStatus}`);
        } else {
          await base44.asServiceRole.entities.Invoice.update(invoice_id, {
            status: "paid",
            amount_paid: sessionAmount,
            paid_date,
            payment_method: "stripe",
          });
          console.log(`Invoice ${invoice_id} marked as paid via Stripe ($${sessionAmount})`);
        }
      } catch (err) {
        console.error("Failed to update invoice:", err.message);
      }
    }
  }

  return Response.json({ received: true });
});