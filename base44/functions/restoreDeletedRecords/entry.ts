import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only: this restores deleted records using the service role.
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    let data: any = {};
    try {
      data = await req.json();
    } catch {
      // empty body is fine — defaults apply
    }

    const results: Record<string, string> = {};

    // 1. Create customer
    const customer = await base44.asServiceRole.entities.Customer.create({
      data: {
        first_name: data.first_name || "Sib",
        last_name: data.last_name || "",
        address: "161 Red Clover Way",
        city: "Milton",
        state: "VT",
        company_id: "69b212bfdcc64b42dee66702",
        customer_type: "homeowner",
        status: "active",
        notifications_enabled: true,
        notes: "RESTORED FROM AUDIT LOG — original customer_id: 6a5a86e4b840a4d8fd94c889."
      }
    });
    results.customer_id = customer.id;

    // 2. Create estimate (sent version, $10,321.54)
    const lineItems = [
      { description: "labor for cabinet repair", quantity: 0.5, unit_price: 85, total: 42.5, category: "service" },
      { description: "Downstairs half bath refresh", quantity: 2, unit_price: 85, total: 170, category: "service" },
      { description: "hang 2 interior closet doors", quantity: 2.5, unit_price: 85, total: 212.5, category: "service" },
      { description: "upstairs bathroom Fan, Faucet, repair above the shower", quantity: 6, unit_price: 85, total: 510, category: "service" },
      { description: "Deck and stair demo and reskin", quantity: 16, unit_price: 85, total: 1360, category: "service" },
      { description: "window trim and fascia replacement", quantity: 7, unit_price: 85, total: 595, category: "service" },
      { description: "3 side pressure wash", quantity: 1, unit_price: 600, total: 600, category: "service" },
      { description: "5/4x6 deck boards", quantity: 18, unit_price: 19.02, total: 342.36 },
      { description: "2x12 stringers", quantity: 3, unit_price: 37.77, total: 113.31 },
      { description: "5/4x6 for steps", quantity: 6, unit_price: 19.02, total: 114.12 },
      { description: "Fasteners", quantity: 1, unit_price: 65, total: 65 },
      { description: "2 rot-proof window sill nose replacement materials", quantity: 1, unit_price: 260, total: 260 },
      { description: "Upstairs bathroom paint", quantity: 8, unit_price: 85, total: 680, category: "service" },
      { description: "Staining with customer provided stain", quantity: 4, unit_price: 85, total: 340, category: "service" },
      { description: "Patio door", quantity: 1, unit_price: 1849.56, total: 1849.56 },
      { description: "sill pan", quantity: 1, unit_price: 273.6, total: 273.6 },
      { description: "sheathing", quantity: 2, unit_price: 80, total: 160 },
      { description: "2x12", quantity: 2, unit_price: 49.78, total: 99.56 },
      { description: "2x10", quantity: 2, unit_price: 38.74, total: 77.48 },
      { description: "Vycor flashing", quantity: 1, unit_price: 82.4, total: 82.4 },
      { description: "Z flashing", quantity: 2, unit_price: 5.6, total: 11.2 },
      { description: "ledger board screws", quantity: 1, unit_price: 67.95, total: 67.95 },
      { description: "structural rot repair man hours includes replacing patio door and sill", quantity: 27, unit_price: 85, total: 2295, category: "service" }
    ];

    const estimate1 = await base44.asServiceRole.entities.Estimate.create({
      data: {
        estimate_number: "EST-0145",
        title: "home repairs",
        customer_id: customer.id,
        company_id: "69b212bfdcc64b42dee66702",
        total: 10321.54,
        subtotal: 10321.54,
        tax_rate: 0, tax_amount: 0, discount: 0,
        status: "sent",
        line_items: lineItems,
        options: [{ name: "Option #1", total: 10321.54, subtotal: 10321.54, tax_amount: 0, tax_rate: 0, discount: 0, line_items: lineItems }],
        scope_of_work: "", valid_until: "", manager_approved: false,
        notes: "RESTORED FROM AUDIT LOG"
      }
    });
    results.estimate1_id = estimate1.id;

    // 3. Create draft estimate
    const estimate2 = await base44.asServiceRole.entities.Estimate.create({
      data: {
        estimate_number: "EST-0145",
        title: "home repairs",
        customer_id: customer.id,
        company_id: "69b212bfdcc64b42dee66702",
        total: 10321.54, subtotal: 10321.54,
        tax_rate: 0, tax_amount: 0, discount: 0,
        status: "draft",
        line_items: lineItems,
        scope_of_work: "", valid_until: "", manager_approved: false,
        notes: "RESTORED FROM AUDIT LOG"
      }
    });
    results.estimate2_id = estimate2.id;

    // 4. Create JOB-0207 (with deposit)
    const job1 = await base44.asServiceRole.entities.Job.create({
      data: {
        job_number: "JOB-0207",
        title: "home repairs",
        customer_id: customer.id,
        company_id: "69b212bfdcc64b42dee66702",
        estimate_id: estimate1.id,
        total_amount: 5404.79,
        status: "in_progress",
        address: "161 red clover way",
        city: "Milton", state: "VT",
        deposit_amount: 2702.39,
        deposit_status: "paid",
        deposit_paid_date: "2026-08-10",
        deposit_stripe_link: "https://buy.stripe.com/9B628j34JgIigf08qd0000d",
        priority: "medium", is_recurring: false, discount: 0, tax_rate: 0,
        line_items: [],
        assigned_techs: ["6a5bd556cd44a65b85c0a2d1", "69b5fdb56e816ed358af6c91"],
        appointments: [{ scheduled_start: "2026-08-10T10:00", scheduled_end: "2026-08-13T17:00", status: "upcoming", notes: "", assigned_techs: ["6a5bd556cd44a65b85c0a2d1", "69b5fdb56e816ed358af6c91"] }],
        notes: "RESTORED FROM AUDIT LOG"
      }
    });
    results.job1_id = job1.id;

    // 5. Create JOB-0195
    const job2 = await base44.asServiceRole.entities.Job.create({
      data: {
        job_number: "JOB-0195",
        title: "EST",
        customer_id: customer.id,
        company_id: "69b212bfdcc64b42dee66702",
        total_amount: 0,
        status: "in_progress",
        service_type: "Honey do list",
        description: "Honey do list needs to be evaluated and quoted. Take photos and measurements.",
        priority: "medium", is_recurring: false, discount: 0, tax_rate: 0,
        line_items: [],
        assigned_techs: ["69b5fdb56e816ed358af6c91"],
        appointments: [{ scheduled_start: "2026-07-21T15:00", scheduled_end: "2026-07-21T15:00", status: "upcoming", notes: "", assigned_techs: ["69b5fdb56e816ed358af6c91"] }],
        notes: "RESTORED FROM AUDIT LOG"
      }
    });
    results.job2_id = job2.id;

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}