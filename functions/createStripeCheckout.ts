import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, success_url, cancel_url } = await req.json();

    if (!invoice_id) {
      return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    }

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const amountDue = (invoice.total || 0) - (invoice.amount_paid || 0);
    if (amountDue <= 0) {
      return Response.json({ error: 'Invoice is already fully paid' }, { status: 400 });
    }

    // Build line items from invoice
    let lineItems = [];
    if (invoice.line_items && invoice.line_items.length > 0) {
      lineItems = invoice.line_items
        .filter(item => item.total > 0)
        .map(item => ({
          price_data: {
            currency: 'usd',
            product_data: { name: item.description || 'Service' },
            unit_amount: Math.round((item.unit_price || 0) * 100),
          },
          quantity: item.quantity || 1,
        }));
    }

    // Fallback: single line item for the total due
    if (lineItems.length === 0) {
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Invoice ${invoice.invoice_number || invoice_id}` },
          unit_amount: Math.round(amountDue * 100),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${success_url}?payment_success=true&invoice_id=${invoice_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || success_url,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id: invoice_id,
      },
    });

    console.log(`Stripe checkout session created: ${session.id} for invoice ${invoice_id}`);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});