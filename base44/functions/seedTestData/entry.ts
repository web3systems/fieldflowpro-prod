import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { company_id } = await req.json();
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    // Check existing data - don't seed if already has customers
    const existing = await base44.asServiceRole.entities.Customer.filter({ company_id });
    if (existing.length > 0) {
      return Response.json({ skipped: true, message: 'Company already has customer data.' });
    }

    // Create sample customers
    const customers = await Promise.all([
      base44.asServiceRole.entities.Customer.create({
        company_id,
        first_name: 'Sarah', last_name: 'Johnson',
        email: 'sarah.johnson@example.com', phone: '(555) 234-5678',
        address: '142 Maple Ave', city: 'Austin', state: 'TX', zip: '78701',
        customer_type: 'homeowner', status: 'active', source: 'referral',
      }),
      base44.asServiceRole.entities.Customer.create({
        company_id,
        first_name: 'Mike', last_name: 'Torres',
        email: 'mike.torres@example.com', phone: '(555) 345-6789',
        address: '88 Oak Street', city: 'Austin', state: 'TX', zip: '78702',
        customer_type: 'homeowner', status: 'active', source: 'google',
      }),
      base44.asServiceRole.entities.Customer.create({
        company_id,
        first_name: 'Apex', last_name: 'Properties',
        business_name: 'Apex Property Management',
        email: 'contact@apexprops.com', phone: '(555) 456-7890',
        address: '500 Commerce Blvd', city: 'Austin', state: 'TX', zip: '78703',
        customer_type: 'business', status: 'active', source: 'website',
      }),
    ]);

    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7);
    const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);

    // Create sample jobs
    const jobs = await Promise.all([
      base44.asServiceRole.entities.Job.create({
        company_id,
        customer_id: customers[0].id,
        title: 'Spring Deep Clean',
        description: 'Full house deep cleaning, 4 bedrooms 2.5 baths',
        status: 'scheduled',
        priority: 'medium',
        scheduled_start: nextWeek.toISOString(),
        scheduled_end: new Date(nextWeek.getTime() + 3 * 3600000).toISOString(),
        address: customers[0].address, city: customers[0].city, state: customers[0].state,
        total_amount: 320,
      }),
      base44.asServiceRole.entities.Job.create({
        company_id,
        customer_id: customers[1].id,
        title: 'Lawn Maintenance',
        description: 'Mow, edge, and blow — front & back yard',
        status: 'completed',
        priority: 'low',
        scheduled_start: lastWeek.toISOString(),
        actual_end: yesterday.toISOString(),
        address: customers[1].address, city: customers[1].city, state: customers[1].state,
        total_amount: 120,
      }),
      base44.asServiceRole.entities.Job.create({
        company_id,
        customer_id: customers[2].id,
        title: 'Office Complex – Monthly Clean',
        description: 'Monthly cleaning contract: 3 floors, common areas, restrooms',
        status: 'in_progress',
        priority: 'high',
        scheduled_start: now.toISOString(),
        address: customers[2].address, city: customers[2].city, state: customers[2].state,
        total_amount: 750,
        is_recurring: true, recurrence_interval: 'monthly',
      }),
    ]);

    // Create sample estimates
    const estimates = await Promise.all([
      base44.asServiceRole.entities.Estimate.create({
        company_id,
        customer_id: customers[0].id,
        estimate_number: 'EST-001',
        title: 'Move-Out Deep Clean',
        status: 'sent',
        line_items: [
          { description: 'Full home deep clean', quantity: 1, unit_price: 425, total: 425 },
          { description: 'Carpet shampoo (3 rooms)', quantity: 3, unit_price: 75, total: 225 },
        ],
        subtotal: 650, tax_rate: 8.25, tax_amount: 53.63, discount: 0, total: 703.63,
        notes: 'Includes all supplies and equipment.',
      }),
      base44.asServiceRole.entities.Estimate.create({
        company_id,
        customer_id: customers[2].id,
        estimate_number: 'EST-002',
        title: 'Annual Exterior Window Cleaning',
        status: 'approved',
        line_items: [
          { description: 'Exterior window cleaning (per floor)', quantity: 3, unit_price: 200, total: 600 },
          { description: 'Screen cleaning', quantity: 1, unit_price: 80, total: 80 },
        ],
        subtotal: 680, tax_rate: 8.25, tax_amount: 56.10, discount: 50, total: 686.10,
      }),
    ]);

    // Create sample invoices
    await Promise.all([
      base44.asServiceRole.entities.Invoice.create({
        company_id,
        customer_id: customers[1].id,
        job_id: jobs[1].id,
        invoice_number: 'INV-001',
        status: 'paid',
        line_items: [{ description: 'Lawn Maintenance', quantity: 1, unit_price: 120, total: 120 }],
        subtotal: 120, tax_rate: 0, tax_amount: 0, total: 120, amount_paid: 120,
        paid_date: yesterday.toISOString().split('T')[0],
        payment_method: 'card',
      }),
      base44.asServiceRole.entities.Invoice.create({
        company_id,
        customer_id: customers[2].id,
        invoice_number: 'INV-002',
        status: 'sent',
        line_items: [{ description: 'Monthly Office Clean – May', quantity: 1, unit_price: 750, total: 750 }],
        subtotal: 750, tax_rate: 8.25, tax_amount: 61.88, total: 811.88, amount_paid: 0,
        due_date: nextWeek.toISOString().split('T')[0],
      }),
    ]);

    // Create sample price book services
    await Promise.all([
      base44.asServiceRole.entities.Service.create({
        company_id, name: 'Standard House Clean', item_type: 'service',
        category: 'Cleaning', unit_price: 150, unit: 'flat', is_active: true, taxable: true,
      }),
      base44.asServiceRole.entities.Service.create({
        company_id, name: 'Deep Clean', item_type: 'service',
        category: 'Cleaning', unit_price: 300, unit: 'flat', is_active: true, taxable: true,
      }),
      base44.asServiceRole.entities.Service.create({
        company_id, name: 'Lawn Mow & Edge', item_type: 'service',
        category: 'Landscaping', unit_price: 80, unit: 'flat', is_active: true, taxable: false,
      }),
    ]);

    console.log('Seed complete for company:', company_id);
    return Response.json({
      success: true,
      seeded: {
        customers: customers.length,
        jobs: jobs.length,
        estimates: estimates.length,
        invoices: 2,
        services: 3,
      }
    });

  } catch (error) {
    console.error('seedTestData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});