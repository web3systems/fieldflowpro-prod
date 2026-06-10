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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoice_id = session.metadata?.invoice_id;
    const isDeposit = session.metadata?.deposit === 'true';

    if (invoice_id) {
      try {
        // Use Eastern Time date for paid_date
        const now = new Date();
        const etDate = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
        const [month, day, year] = etDate.split("/");
        const paid_date = `${year}-${month}-${day}`;

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
          console.log(`Deposit of $${sessionAmount} recorded on invoice ${invoice_id}. New amount paid: $${newAmountPaid}, status: ${newStatus}`);
        } else {
          await base44.asServiceRole.entities.Invoice.update(invoice_id, {
            status: "paid",
            amount_paid: sessionAmount,
            paid_date,
            payment_method: "stripe",
          });
          console.log(`Invoice ${invoice_id} marked as paid via Stripe webhook ($${sessionAmount})`);
        }
      } catch (err) {
        console.error("Failed to update invoice:", err.message);
      }
    }
  }

  return Response.json({ received: true });
});