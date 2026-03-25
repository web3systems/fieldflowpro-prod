import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, company_id, return_url, refresh_url } = await req.json();

    if (action === 'create_account') {
      // Create a new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: {
          company_id,
          base44_app_id: Deno.env.get("BASE44_APP_ID")
        }
      });

      // Save the account ID to the company
      await base44.asServiceRole.entities.Company.update(company_id, {
        stripe_account_id: account.id,
        stripe_onboarding_complete: false
      });

      console.log(`Created Stripe Connect account ${account.id} for company ${company_id}`);

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refresh_url || `${return_url}?stripe_refresh=true`,
        return_url: return_url || `${return_url}?stripe_return=true`,
        type: 'account_onboarding'
      });

      return Response.json({ url: accountLink.url, account_id: account.id });
    }

    if (action === 'get_onboarding_link') {
      // Get a new onboarding link for an existing account (e.g. after refresh)
      const company = await base44.asServiceRole.entities.Company.get(company_id);
      if (!company?.stripe_account_id) {
        return Response.json({ error: 'No Stripe account found for this company' }, { status: 404 });
      }

      const accountLink = await stripe.accountLinks.create({
        account: company.stripe_account_id,
        refresh_url: refresh_url,
        return_url: return_url,
        type: 'account_onboarding'
      });

      return Response.json({ url: accountLink.url });
    }

    if (action === 'get_dashboard_link') {
      const company = await base44.asServiceRole.entities.Company.get(company_id);
      if (!company?.stripe_account_id) {
        return Response.json({ error: 'No Stripe account found' }, { status: 404 });
      }

      const loginLink = await stripe.accounts.createLoginLink(company.stripe_account_id);
      return Response.json({ url: loginLink.url });
    }

    if (action === 'check_status') {
      const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
      const company = companies[0];
      if (!company?.stripe_account_id) {
        return Response.json({ connected: false });
      }

      try {
        const account = await stripe.accounts.retrieve(company.stripe_account_id);
        const isComplete = account.charges_enabled && account.details_submitted;

        if (isComplete !== company.stripe_onboarding_complete) {
          await base44.asServiceRole.entities.Company.update(company_id, {
            stripe_onboarding_complete: isComplete
          });
        }

        return Response.json({
          connected: true,
          account_id: company.stripe_account_id,
          charges_enabled: account.charges_enabled,
          details_submitted: account.details_submitted,
          onboarding_complete: isComplete
        });
      } catch (stripeErr) {
        console.error('Stripe account retrieve error:', stripeErr.message);
        // Account may have been deleted/deauthorized — reset
        if (stripeErr.code === 'account_invalid' || stripeErr.statusCode === 404) {
          await base44.asServiceRole.entities.Company.update(company_id, {
            stripe_account_id: null,
            stripe_onboarding_complete: false
          });
          return Response.json({ connected: false });
        }
        throw stripeErr;
      }
    }

    if (action === 'disconnect') {
      const company = await base44.asServiceRole.entities.Company.get(company_id);
      if (company?.stripe_account_id) {
        // Deauthorize the account
        await stripe.oauth.deauthorize({
          client_id: company.stripe_account_id,
          stripe_user_id: company.stripe_account_id
        }).catch(e => console.log('Deauthorize error (non-fatal):', e.message));

        await base44.asServiceRole.entities.Company.update(company_id, {
          stripe_account_id: null,
          stripe_onboarding_complete: false
        });
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Stripe Connect error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});