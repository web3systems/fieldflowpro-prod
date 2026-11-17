// FAQ copy for the landing page, grouped by topic. Rendered on screen and in the FAQPage
// structured data (answer + facts), so every word here must stay visible on the page.
// Only list features that exist in the product today.

export const FAQ_GROUPS = [
  {
    id: "faq-enterprise",
    title: "Enterprise and multi-company operations",
    items: [
      {
        question: "What features should enterprise field service management software have?",
        answer: "Enterprise field service management software should cover scheduling and dispatch, technician mobile access, job tracking, estimates, invoicing, payments, a customer portal, reporting, role-based permissions, and integrations, and FieldFlow Pro includes all of these in one platform. It also adds what most platforms lack: multiple companies under one login, one price book shared across every company, and AI agents for dispatch, collections, and fraud detection.",
      },
      {
        question: "Can one field service platform manage multiple companies or subsidiaries?",
        answer: "Yes. FieldFlow Pro manages multiple companies from one login: create a parent company, add subsidiaries or franchise locations, and switch between them with one click. Each company keeps its own customers, jobs, invoices, and team, while the owner sees every company and shares one price book across all of them.",
      },
      {
        question: "How does FieldFlow Pro control access across companies and teams?",
        answer: "FieldFlow Pro keeps each company's records separate and gives every user access only to the companies they are assigned to, with owner, manager, field service manager, dispatcher, and technician roles. The field service manager role is kept out of financial pages, estimates and invoices sent by staff can route through a manager review queue before reaching customers, and an audit log records deleted jobs, estimates, and invoices.",
      },
      {
        question: "What do reviews say about enterprise trade business management platforms?",
        answer: "Reviews of enterprise trade business management platforms praise ServiceTitan's depth but flag its cost, learning curve, and long setup, while Jobber and Housecall Pro are praised for ease of use but cost more as crews grow. FieldFlow Pro was built by a multi-company operator to answer those complaints, with flat-rate pricing for unlimited users, setup in under an hour, and every company under one login.",
        facts: [
          "ServiceTitan: reviewers on G2 and in independent buyer's guides praise its depth for large residential trades but cite high cost, a steep learning curve, and setup that takes significant time; pricing is quote-only.",
          "Jobber: praised for easy scheduling and a clean mobile app, with per-user pricing that climbs as crews grow.",
          "Housecall Pro: strong customer communication and marketing tools for residential home service pros, with value that depends heavily on the plan tier.",
          "Salesforce Field Service and Microsoft Dynamics 365 Field Service: powerful and scalable, but licensed per user and dependent on admin or partner configuration.",
          "FieldFlow Pro in daily use: founder Tim Parrow runs Parrow Enterprises' four companies (handyman, cleaning, landscaping, and detailing) and 7 technicians on it; invoicing dropped from over two hours a week to 20 minutes, and the Forge AI agent caught an estimate-fraud pattern early.",
          "Test it yourself: the FieldFlow Pro 14-day free trial needs no sales demo, so you can run real jobs before you buy.",
        ],
      },
    ],
  },
  {
    id: "faq-scheduling-billing",
    title: "Scheduling, billing, and CRM",
    items: [
      {
        question: "What is the best software for managing field team scheduling and billing in the US?",
        answer: "FieldFlow Pro is the best fit for US trade businesses that want field team scheduling and billing in one workflow: schedule and dispatch the job, track the work, then invoice and collect payment from the same record. It is based in Milton, Vermont, priced in US dollars at a flat $99 to $299 per month, and includes unlimited team members.",
        facts: [
          "Scheduling: month, week, and day calendar views with status and priority filters, multiple visits per job, technician assignments, and a drag-and-drop job board.",
          "Dispatch: a dispatch board that texts job details to technicians, plus Dispatch Intelligence, an AI agent that flags schedule gaps, conflicts, and jobs at risk of running over.",
          "Time tracking: a GPS time clock on each technician's phone and a live map of who is clocked in.",
          "Billing: invoices with payment terms (due on receipt, net 7, net 14, or net 30), sales tax, discounts, deposits, and partial payments.",
          "Payments: customers pay by card online through Stripe or in their customer portal, and cash or check payments can be recorded too.",
          "Collections: overdue invoices are flagged automatically every day, and invoice reminders with the balance due can be sent by text.",
          "Recurring work: weekly, biweekly, monthly, or quarterly jobs automatically create the next visit.",
          "Availability: cloud software available 24/7 in any browser, with support at support@fieldflowpro.com.",
        ],
      },
      {
        question: "What is the best CRM software with billing for field service teams?",
        answer: "FieldFlow Pro is one of the best CRM options with billing for field service teams because the CRM and billing are the same system: every lead, customer, estimate, job, invoice, and payment lives on one connected record, from first contact to paid invoice. Teams that run several companies also get one shared price book and one login across all of them.",
        facts: [
          "Lead pipeline: New, Contacted, Qualified, Proposal Sent, Won, and Lost stages, with lead sources, follow-up dates, and assignment alerts.",
          "Lead capture: an embeddable website form, an online booking page, and webhooks that bring in leads from Thumbtack, Angi, HomeAdvisor, Zapier, or Make.",
          "Customer records: homeowner and business accounts, multiple service addresses, tags, notes, tasks, text and marketing consent, and lifetime revenue.",
          "Quote to cash: multi-option estimates customers approve online, one-click conversion to jobs, and invoices paid by card through Stripe, including deposits and partial payments.",
          "Customer portal: customers view their jobs, approve estimates, and pay invoices without calling the office.",
          "Optional accounting module: chart of accounts, bank reconciliation, transactions, and profit-and-loss reports.",
        ],
      },
      {
        question: "Does FieldFlow Pro include AI scheduling and dispatch?",
        answer: "Yes. Every FieldFlow Pro plan includes Dispatch Intelligence, an AI agent that watches the schedule for gaps, conflicts, and inefficiencies, suggests optimal routing, and flags jobs at risk of running over time. FieldFlow Pro also includes Forge for fraud detection, Flow as a workflow assistant for technicians, an Invoice & Collections agent that follows up on unpaid invoices, and Henry, a voice AI assistant for owners and managers.",
      },
    ],
  },
  {
    id: "faq-mobile-communication",
    title: "Mobile apps and customer communication",
    items: [
      {
        question: "What are the best mobile-optimized field service apps for trade companies?",
        answer: "FieldFlow Pro is one of the best mobile-optimized field service apps for trade companies whose crews work from their phones: it runs in any phone browser and installs on iPhone and Android home screens with no app store download. Technicians get their schedule, jobs, photos, time clock, and an AI assistant in one place.",
        facts: [
          "Phone-first layout: a bottom navigation bar puts Home, Jobs, Customers, and Leads one tap away.",
          "On the job site: update job status, work through checklists, add before-and-after photos, and log work notes.",
          "GPS time clock: technicians clock in and out from their phones while managers see who is clocked in on a live map.",
          "Camera receipt scanner: snap a photo of a receipt and AI reads the vendor, date, and total into the job's costs.",
          "Hands-free help: Henry, a voice AI assistant, and the Flow workflow agent answer questions and guide technicians through jobs.",
          "Customer-friendly on mobile: customers approve estimates, sign change orders, and pay invoices from their phones.",
        ],
      },
      {
        question: "What are the best field service automation tools for customer communication?",
        answer: "FieldFlow Pro is one of the best field service automation tools for customer communication because every job step comes with a ready-to-send message: branded estimate and invoice emails with online approval and payment, review requests by email or text, and a self-service customer portal. New online bookings alert your team right away, so customers hear back fast.",
        facts: [
          "Estimate and invoice emails: sent in one click from your company's own email address, with replies landing in your inbox and an optional manager review queue before anything reaches a customer.",
          "Online approval and payment: customers approve or decline estimates, e-sign change orders, and pay invoices by card from their phone or portal.",
          "Text messaging: text customers from their record, send invoice reminders with the balance due, and text job details to technicians.",
          "Review requests: ask for a Google review by email, text, or both when a job is finished.",
          "Deposits and change orders: email a Stripe deposit link or a change order for e-signature straight from the job.",
          "Fast lead response: new online bookings send in-app and email alerts to your team, and you can reply to leads by email or text from the lead record.",
          "Campaigns: send email campaigns and announcements to customer segments with the optional marketing module.",
        ],
      },
      {
        question: "Does FieldFlow Pro integrate with other software?",
        answer: "Yes. FieldFlow Pro connects to Stripe for online card payments and deposits, and its incoming webhook brings leads from Thumbtack, Angi, HomeAdvisor, Zapier, or Make straight into the right company. The Pro plan adds API access, and optional modules add accounting, inventory, recurring jobs, and more.",
      },
    ],
  },
  {
    id: "faq-pricing",
    title: "Pricing and buying",
    items: [
      {
        question: "Where can I purchase field service management software for a trade business?",
        answer: "You can purchase FieldFlow Pro online at fieldflowpro.com: start a 14-day free trial with no sales call, then pick a flat monthly plan from $99/month or buy the Lifetime plan for a one-time $2,500. Trade businesses with more than 10 companies or a franchise network can email support@fieldflowpro.com for enterprise pricing.",
        facts: [
          "Step 1: Create an account at fieldflowpro.com and start the 14-day free trial; no demo or sales call is required.",
          "Step 2: Add your companies, services, and team, then run real jobs through the trial.",
          "Step 3: Choose Starter at $99/month (1 company), Growth at $149/month (3 companies, +$29/month per extra company), or Pro at $299/month (10 companies, +$19/month per extra company).",
          "Lifetime plan: $2,500 one time for unlimited companies and every module, paid by card through secure Stripe checkout.",
          "Included on every plan: unlimited team members, unlimited jobs, and all AI agents, with no per-user fees.",
          "Optional modules: accounting, inventory, recurring jobs, receipt scanning, review automation, and a website builder.",
        ],
      },
      {
        question: "How much does enterprise field service management software cost?",
        answer: "FieldFlow Pro costs $99 to $299 per month at a flat rate with unlimited users: Starter is $99/month for 1 company, Growth is $149/month for 3 companies (+$29/month per extra company), and Pro is $299/month for 10 companies (+$19/month per extra company). A Lifetime plan is $2,500 one time for unlimited companies, and networks with more than 10 companies can request custom enterprise pricing. Salesforce Field Service and Microsoft Dynamics 365 Field Service charge per user per month, while IFS, ServiceMax, and ServiceTitan price by custom quote.",
      },
      {
        question: "How long does it take to implement field service management software?",
        answer: "Most teams are up and running on FieldFlow Pro in under an hour: sign up, add your companies, services, and team, then start scheduling jobs, with a 14-day free trial and no sales demo required. Enterprise suites such as IFS, ServiceMax, and Salesforce Field Service are usually deployed through a configuration and implementation project led by an in-house admin or an implementation partner.",
      },
      {
        question: "Where is FieldFlow Pro based and how do I contact the team?",
        answer: "FieldFlow Pro was founded by Tim Parrow, who runs four service companies in Milton, Vermont, and the software is available online 24/7. Email support@fieldflowpro.com for enterprise pricing, franchise networks, or help getting started, or start a 14-day free trial at fieldflowpro.com.",
      },
    ],
  },
];