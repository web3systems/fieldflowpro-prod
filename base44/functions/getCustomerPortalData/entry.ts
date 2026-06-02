import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be authenticated
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, payload } = await req.json();

    // Find all customer records linked to this user (by portal_user_id or email)
    const allCustomers = await base44.asServiceRole.entities.Customer.list();
    const myCustomers = allCustomers.filter(
      c => c.portal_user_id === user.id || c.email === user.email
    );

    if (myCustomers.length === 0) {
      // Check if this is a staff user who should be redirected
      const accessRecords = await base44.asServiceRole.entities.UserCompanyAccess.filter({ user_email: user.email });
      const isCustomer = user.role === 'customer';
      const isStaff = !isCustomer && (accessRecords.length > 0 || (user.role && !['user', 'customer'].includes(user.role)));
      if (isStaff) {
        return Response.json({ is_staff: true });
      }
      return Response.json({ customers: [], companies: [] });
    }

    if (action === 'init') {
      // Return only the customers and their companies
      const companyIds = [...new Set(myCustomers.map(c => c.company_id).filter(Boolean))];
      const companies = [];
      for (const cid of companyIds) {
        const found = await base44.asServiceRole.entities.Company.filter({ id: cid });
        if (found[0]) {
          // Only return safe public fields
          const c = found[0];
          companies.push({
            id: c.id,
            name: c.name,
            logo_url: c.logo_url,
            primary_color: c.primary_color,
            phone: c.phone,
            email: c.email,
            google_review_url: c.google_review_url,
            portal_settings: c.portal_settings,
          });
        }
      }

      // Return safe customer fields only
      const safeCustomers = myCustomers.map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
        company_id: c.company_id,
      }));

      return Response.json({ customers: safeCustomers, companies });
    }

    if (action === 'load_account') {
      const { customer_id } = payload || {};

      // Verify this customer_id belongs to the authenticated user
      const customer = myCustomers.find(c => c.id === customer_id);
      if (!customer) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const [jobs, invoices, estimates, services] = await Promise.all([
        base44.asServiceRole.entities.Job.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.Invoice.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.Estimate.filter({ customer_id: customer.id }),
        base44.asServiceRole.entities.Service.filter({ company_id: customer.company_id, is_active: true }),
      ]);

      // Strip sensitive internal fields from jobs before sending to customer
      const safeJobs = jobs.map(j => ({
        id: j.id,
        title: j.title,
        status: j.status,
        service_type: j.service_type,
        scheduled_start: j.scheduled_start,
        scheduled_end: j.scheduled_end,
        address: j.address,
        city: j.city,
        state: j.state,
        description: j.description,
        before_photos: j.before_photos,
        after_photos: j.after_photos,
        checklist: j.checklist,
        notes: j.notes,
        // Intentionally excluded: internal_notes, internal_notes_log, assigned_techs, receipts, total_amount
      }));

      // Strip sensitive invoice fields
      const safeInvoices = invoices
        .filter(inv => !['draft', 'void'].includes(inv.status)) // don't show draft/void to customers
        .map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: inv.status,
          total: inv.total,
          amount_paid: inv.amount_paid,
          due_date: inv.due_date,
          paid_date: inv.paid_date,
          created_date: inv.created_date,
          line_items: inv.line_items,
          notes: inv.notes,
          subtotal: inv.subtotal,
          tax_rate: inv.tax_rate,
          tax_amount: inv.tax_amount,
          discount: inv.discount,
        }));

      // Strip sensitive estimate fields
      const safeEstimates = estimates
        .filter(est => !['draft'].includes(est.status)) // don't show drafts
        .map(est => ({
          id: est.id,
          estimate_number: est.estimate_number,
          title: est.title,
          status: est.status,
          total: est.total,
          valid_until: est.valid_until,
          notes: est.notes,
          line_items: est.line_items,
          options: est.options,
          created_date: est.created_date,
        }));

      const safeServices = services.map(s => ({
        id: s.id,
        name: s.name,
        unit_price: s.unit_price,
        description: s.description,
      }));

      return Response.json({
        jobs: safeJobs,
        invoices: safeInvoices,
        estimates: safeEstimates,
        services: safeServices,
      });
    }

    if (action === 'approve_estimate') {
      const { estimate_id, decision } = payload || {};
      if (!['approved', 'declined'].includes(decision)) {
        return Response.json({ error: 'Invalid decision' }, { status: 400 });
      }

      // Verify estimate belongs to one of the user's customers
      const estimates = await base44.asServiceRole.entities.Estimate.filter({ id: estimate_id });
      const estimate = estimates[0];
      if (!estimate) return Response.json({ error: 'Not found' }, { status: 404 });

      const ownsEstimate = myCustomers.some(c => c.id === estimate.customer_id);
      if (!ownsEstimate) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // Only allow action on pending estimates
      if (!['sent', 'viewed'].includes(estimate.status)) {
        return Response.json({ error: 'Estimate cannot be updated' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Estimate.update(estimate_id, { status: decision });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('getCustomerPortalData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});