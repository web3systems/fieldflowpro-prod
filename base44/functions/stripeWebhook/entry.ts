import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const invoice_id = session.metadata?.invoice_id;

    if (invoice_id) {
      try {
        await base44.asServiceRole.entities.Invoice.update(invoice_id, {
          status: "paid",
          amount_paid: (session.amount_total || 0) / 100,
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: "stripe",
        });
        console.log(`Invoice ${invoice_id} marked as paid via Stripe webhook`);
      } catch (err) {
        console.error("Failed to update invoice:", err.message);
      }
    }
  }

  return Response.json({ received: true });
});