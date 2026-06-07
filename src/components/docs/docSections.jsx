// All documentation section data — content, steps, screenshots, and FAQs

export const sections = [
  {
    id: "dashboard",
    label: "Dashboard",
    colorClass: "bg-blue-100 text-blue-700",
    tag: "All Users",
    summary: "Your home base. See everything at a glance — jobs, revenue, leads, and today's schedule.",
    screenshot: {
      placeholder: "Dashboard overview showing KPI cards, revenue chart, and active jobs list",
      caption: "The Dashboard gives you a real-time snapshot of your business performance."
    },
    steps: [
      {
        title: "Understanding the KPI Cards",
        body: "At the very top of the dashboard you'll find four summary cards:\n• Total Revenue — sum of all paid invoices for the current period\n• Active Jobs — jobs currently in 'New', 'Scheduled', or 'In Progress' status\n• New Leads — leads created in the last 30 days\n• Pending Invoices — invoices sent but not yet paid\n\nThese update in real time — no need to refresh the page."
      },
      {
        title: "Using the Revenue Chart",
        body: "Below the KPI cards is a bar/line chart showing revenue over time. You can:\n• Switch between Weekly, Monthly, and Yearly views using the buttons above the chart\n• Hover over any bar to see the exact revenue amount for that period\n• The chart pulls data from paid invoices only — partial and pending invoices are not included"
      },
      {
        title: "Active Jobs Panel",
        body: "The Active Jobs panel lists all jobs currently assigned to your company that are not yet completed or cancelled. Each row shows:\n• Job title and customer name\n• Current status badge (New / Scheduled / In Progress)\n• Assigned technician(s)\n• Scheduled date\n\nClick any row to open the full Job Detail page."
      },
      {
        title: "Today's Schedule Preview",
        body: "The schedule preview shows jobs scheduled for today in chronological order. This is a read-only view — click 'View Full Schedule' to open the interactive calendar with drag-and-drop."
      },
      {
        title: "Onboarding Banner",
        body: "New accounts will see an Onboarding Banner at the top of the dashboard. It walks you through the key setup steps:\n1. Add your company logo and info\n2. Invite your first team member\n3. Add your first customer\n4. Create your first estimate\n5. Connect Stripe for online payments\n\nThe banner disappears automatically once all steps are complete."
      },
      {
        title: "Role-Based Views",
        body: "What you see depends on your role:\n• Admin / Manager — sees all company data including revenue, all jobs, and all customers\n• Standard User — sees only jobs assigned to their technician record\n• Field Technician — sees their daily schedule and assigned job list\n\nIf you have access to multiple companies, use the Company Switcher in the top-left sidebar to switch between them."
      }
    ],
    faqs: [
      { q: "Why is my revenue chart showing $0?", a: "The revenue chart only counts invoices with a 'Paid' status. If you have invoices that are sent or overdue but not marked paid, they won't appear. Use the Invoices page to record payments." },
      { q: "I can see jobs but no revenue — why?", a: "Jobs don't generate revenue directly. Revenue is counted when linked invoices are marked as paid. Make sure you've created and paid invoices against your completed jobs." },
      { q: "How do I switch between companies on the dashboard?", a: "Use the Company Switcher dropdown in the top-left of the sidebar. Select the company you want to view and the dashboard will reload with that company's data." },
      { q: "My onboarding banner is still showing even though I've done everything.", a: "Each step has a specific trigger. Make sure your company has a logo URL set, at least one employee invited, one customer created, one estimate created, and Stripe connected. Check each step carefully." }
    ]
  },
  {
    id: "leads",
    label: "Leads",
    colorClass: "bg-green-100 text-green-700",
    tag: "All Users",
    summary: "Capture, track, and convert potential customers into paying clients.",
    screenshot: {
      placeholder: "Leads list view with status columns, search bar, and Add Lead button",
      caption: "The Leads page showing pipeline status, source tracking, and quick-convert actions."
    },
    steps: [
      {
        title: "How Leads Enter the System",
        body: "Leads can come from three sources:\n1. Manual Entry — click 'Add Lead' and fill in the form directly\n2. Lead Capture Widget — an embeddable form for your website (get the embed code from the Leads page toolbar)\n3. Booking Widget — when a customer requests a booking, a lead is automatically created\n\nAll leads land in the Leads list with a 'New' status."
      },
      {
        title: "Navigating the Leads List",
        body: "The leads list shows all leads for your selected company. Each row displays:\n• Contact name and email\n• Lead status (New, Contacted, Qualified, Converted, Lost)\n• Source (Website, Referral, Google, Facebook, etc.)\n• Date created\n• Assigned rep\n\nUse the search bar to find leads by name or email. Use the filter dropdowns to narrow by status or source."
      },
      {
        title: "Opening a Lead Detail",
        body: "Click any lead row to open the Lead Detail page. Here you can:\n• View and edit all contact information\n• See the full activity timeline (calls logged, emails sent, status changes)\n• Add internal notes\n• Log activities (called, emailed, met in person)\n• Change the lead status\n• Convert to a customer"
      },
      {
        title: "Updating Lead Status",
        body: "As you work a lead, update its status to track progress:\n• New → just came in, not yet contacted\n• Contacted → you've reached out at least once\n• Qualified → confirmed they have a real need and budget\n• Converted → they became a paying customer\n• Lost → they chose another provider or went cold\n\nStatus can be changed from both the Lead List (inline dropdown) and the Lead Detail page."
      },
      {
        title: "Converting a Lead to a Customer",
        body: "When a lead is ready to move forward:\n1. Open the Lead Detail page\n2. Click the 'Convert to Customer' button (top right)\n3. Review the pre-filled customer form — all lead info is carried over\n4. Click Save\n\nThe lead status will change to 'Converted' and a new Customer record will be created. A link between the lead and customer is maintained for reporting."
      },
      {
        title: "Setting Up the Lead Capture Embed",
        body: "To capture leads directly from your website:\n1. Go to the Leads page\n2. Click 'Embed Form' in the toolbar\n3. Copy the provided iframe code\n4. Paste it into any page on your website\n\nWhen visitors fill out the form, a lead is automatically created in FieldFlow Pro with the source set to 'Website'. You'll receive a notification email if admin notifications are enabled."
      }
    ],
    faqs: [
      { q: "Can I assign leads to specific team members?", a: "Yes. On the Lead Detail page, use the 'Assigned To' field to assign the lead to any team member. They'll see assigned leads in their personal view." },
      { q: "What happens to a lead after it's converted?", a: "The lead record remains in the system with a 'Converted' status. A Customer record is created with the same information. The lead and customer are linked so you can trace the origin of any customer." },
      { q: "How do I delete a lead?", a: "Open the Lead Detail page and use the Actions menu (⋯) in the top right to find the Delete option. Note that deleting a lead is permanent — consider marking it as 'Lost' instead to preserve history." },
      { q: "Can customers submit the lead form without me knowing?", a: "By default, no notification is sent unless you enable 'New Lead' notifications in the Notifications settings. Go to Notifications → Admin Notifications → toggle 'New Lead Submitted'." },
      { q: "The embed form isn't showing on my website — what's wrong?", a: "Make sure your website allows iframes. Some website builders (like Wix or Squarespace) restrict iframe embedding in certain plan tiers. Also check that the iframe src URL is correct and hasn't been modified." }
    ]
  },
  {
    id: "customers",
    label: "Customers",
    colorClass: "bg-purple-100 text-purple-700",
    tag: "All Users",
    summary: "Manage your full customer database — contact info, history, addresses, and portal access.",
    screenshot: {
      placeholder: "Customer list with search, filter by status, and customer cards showing name, email, and revenue",
      caption: "The Customers page — your full CRM with contact details, history, and portal management."
    },
    steps: [
      {
        title: "Adding a New Customer",
        body: "Click 'Add Customer' in the top right. The customer form includes:\n• Customer Type — Homeowner or Business\n• First/Last Name (or Business Name for commercial clients)\n• Email and Phone\n• Primary Address\n• Source (how they found you)\n• Status (Active, Inactive, Lead)\n• Tags for custom categorization\n\nAt minimum, the Company ID is required (automatically set). Email is strongly recommended to enable portal invites and invoice delivery."
      },
      {
        title: "Exploring the Customer Detail Page",
        body: "Click any customer to open their full profile. The detail page has several tabs:\n• Overview — contact info, recent activity, total revenue, quick actions\n• Jobs — all jobs linked to this customer\n• Estimates — all estimates sent to this customer\n• Invoices — all invoices for this customer\n• Messages — communication thread\n• Addresses — all service locations\n• Notes & Tasks — internal staff notes and follow-up tasks"
      },
      {
        title: "Managing Multiple Service Addresses",
        body: "Many customers have more than one location (e.g., home + rental property).\n1. Open the Customer Detail page\n2. Click the 'Addresses' tab\n3. Click 'Add Address'\n4. Label it (e.g., 'Main Home', 'Beach House') and fill in the address fields\n5. Save\n\nWhen creating a job for this customer, you can select which service address to use."
      },
      {
        title: "Sending a Portal Invite",
        body: "Give customers self-service access to their account:\n1. Open the Customer Detail page\n2. Click 'Send Portal Invite' (top right or in the Overview tab)\n3. The customer will receive an email with a secure link to log in\n4. Once logged in, they can view jobs, approve estimates, pay invoices, and message you\n\nThe invite status shows 'Invite Sent' with the timestamp once dispatched. Re-send at any time if the customer didn't receive it."
      },
      {
        title: "Adding Internal Notes and Tasks",
        body: "Internal notes are staff-only reminders about a customer:\n• Open the Customer Detail → Notes tab\n• Click 'Add Note' and type your note\n• Notes are timestamped and attributed to the staff member who created them\n\nTasks are follow-up items:\n• Click 'Add Task' and describe the action\n• Mark tasks complete as you work through them\n• Tasks are visible to all staff with access to that company"
      },
      {
        title: "Filtering and Searching Customers",
        body: "The Customers list supports:\n• Free-text search — searches name, email, phone, and business name\n• Status filter — Active, Inactive, Lead\n• Source filter — Website, Referral, Google, etc.\n• Tag filter — filter by any custom tags you've applied\n\nUse the sort options to order by name, date added, or total revenue."
      }
    ],
    faqs: [
      { q: "Can a customer have jobs at multiple addresses?", a: "Yes. Each job has its own address field separate from the customer's primary address. When creating a job, you can select any of the customer's saved service addresses or enter a custom one." },
      { q: "What's the difference between a Customer and a Lead?", a: "Leads are prospects who haven't been converted yet — they're in your pipeline. Customers are confirmed clients you've done or plan to do work for. Leads can be converted to Customers from the Lead Detail page." },
      { q: "How do I merge duplicate customer records?", a: "There is no automatic merge tool. The best practice is to manually move any jobs or invoices to the correct record, then mark the duplicate as 'Inactive' rather than deleting it." },
      { q: "The customer says they never received the portal invite email.", a: "Check that their email address is correct on the customer record. Also verify your company email settings are configured (Company Settings → Email). Ask them to check spam/junk. You can re-send the invite from the Customer Detail page." },
      { q: "Can I bulk-import customers from a spreadsheet?", a: "Currently, bulk import is not available directly on the Customers page. Contact support if you need to migrate a large customer list from another system." }
    ]
  },
  {
    id: "estimates",
    label: "Estimates",
    colorClass: "bg-yellow-100 text-yellow-700",
    tag: "All Users",
    summary: "Create professional multi-option estimates, send them to customers, and track approvals.",
    screenshot: {
      placeholder: "Estimate editor showing line items, totals, multi-option tabs, and Send button",
      caption: "The Estimate editor — build detailed quotes with line items, taxes, and multiple package options."
    },
    steps: [
      {
        title: "Creating a New Estimate",
        body: "Click 'New Estimate' from the Estimates page or Dashboard.\n1. Select the Customer — required. Type to search.\n2. Add a Title (e.g., 'Lawn Care - Spring Package')\n3. Set a Valid Until date — estimates expire after this date\n4. Add Line Items — either manually or from the Price Book\n5. Set the Tax Rate if applicable\n6. Apply a Discount (flat dollar or %)\n7. Add any Notes for the customer\n8. Save as Draft or Send immediately"
      },
      {
        title: "Adding Line Items",
        body: "Line items are the individual services or materials in your quote. For each item:\n• Description — what the work or item is\n• Quantity — how many units\n• Unit Price — price per unit\n• Total — auto-calculated\n\nTo pull from your Price Book, click 'Add from Price Book', search your catalog, and click the item. All fields pre-fill from your saved pricing, which you can adjust for this specific estimate."
      },
      {
        title: "Creating Multi-Option Estimates",
        body: "Multi-option estimates let customers choose between packages (e.g., Basic, Standard, Premium).\n1. While editing an estimate, click 'Add Option' in the Options panel\n2. Name the option (e.g., 'Basic Package')\n3. Add line items specific to that option\n4. Repeat for each tier\n\nWhen the customer opens the estimate, they'll see all options with a selector. They choose their preferred package before approving."
      },
      {
        title: "Sending an Estimate to the Customer",
        body: "Once the estimate looks right:\n1. Click 'Send Estimate'\n2. A preview of the email is shown — confirm the recipient email\n3. Click Send\n\nThe customer receives an email with a secure link to view the estimate online. They can approve, decline, or ask questions. The estimate status updates automatically:\n• Draft → Sent (when you send)\n• Sent → Viewed (when customer opens the link)\n• Viewed → Approved or Declined (when they respond)"
      },
      {
        title: "Understanding Margin Review",
        body: "If your company has Margin Rules configured (Company Settings → Margin Rules), a margin review panel appears before sending.\n\nThe panel shows:\n• Calculated markup % for each line item\n• Whether items meet the minimum markup threshold\n• Overall estimate margin %\n\nIf any items fall below the minimum, they'll be flagged in red. You can still send the estimate, but a manager review may be required depending on your settings."
      },
      {
        title: "Converting an Approved Estimate",
        body: "Once a customer approves an estimate:\n1. Open the Estimate Detail page\n2. Use the action buttons at the top:\n   • 'Convert to Job' — creates a new Job with the estimate linked\n   • 'Create Invoice' — creates an invoice pre-filled with the estimate's line items\n\nYou can do both — create a job first to track the work, then create the invoice when ready to bill."
      }
    ],
    faqs: [
      { q: "Can I resend an estimate after the customer has already viewed it?", a: "Yes. Open the Estimate Detail and click 'Resend'. The customer will receive a fresh email with the same estimate link. This is useful if they lost the original email." },
      { q: "What happens after an estimate expires (Valid Until date passes)?", a: "The estimate status changes to 'Expired'. Expired estimates cannot be approved by the customer. You'll need to create a new estimate or extend the valid until date and resend." },
      { q: "Can I download the estimate as a PDF?", a: "Yes. On the Estimate Detail page, look for the PDF/Download button in the toolbar. This generates a professional PDF with your company branding." },
      { q: "Can a customer approve just one option of a multi-option estimate?", a: "Yes — that's the purpose of multi-option estimates. The customer selects their preferred option and then clicks Approve. Only the selected option's line items carry over when converting to a job or invoice." },
      { q: "Why is the AI Estimator option not showing?", a: "The AI Estimator is available on Professional and Enterprise plans. If you're on the Starter plan, upgrade your subscription to access it. You can access it from Estimates → AI Estimator in the top toolbar." }
    ]
  },
  {
    id: "jobs",
    label: "Jobs",
    colorClass: "bg-orange-100 text-orange-700",
    tag: "All Users",
    summary: "Track every job from creation to completion — assign techs, log notes, upload photos.",
    screenshot: {
      placeholder: "Job detail page showing sidebar with status, tech assignment, schedule, and tabbed content for notes/photos/receipts",
      caption: "The Job Detail page — the central hub for tracking all work from dispatch to completion."
    },
    steps: [
      {
        title: "Creating a New Job",
        body: "Click 'New Job' from the Jobs list, Dashboard, or directly from a Customer Detail page.\n\nRequired fields:\n• Customer — link to an existing customer record\n• Title — a short name for the job (e.g., 'Exterior House Painting')\n\nOptional but recommended:\n• Service Type — categorize the work\n• Scheduled Start / End — needed for the calendar view\n• Priority — Low, Medium, High, Urgent\n• Linked Estimate — pulls in approved line items automatically"
      },
      {
        title: "Understanding the Job Detail Layout",
        body: "The Job Detail page has two main areas:\n\nLeft Sidebar — quick-access fields:\n• Status (change it here as work progresses)\n• Priority\n• Assigned Technicians\n• Scheduled Start/End dates\n• Service Address\n• Total Amount\n\nMain Content Area (tabbed):\n• Notes — internal and customer-facing notes\n• Photos — before/after photo upload\n• Receipts — material receipt upload with OCR\n• Costing — labor/material cost tracking\n• Checklist — step-by-step task checklist\n• Invoice — linked invoice management\n• Activity Feed — full history of all changes"
      },
      {
        title: "Moving a Job Through Statuses",
        body: "Use the Status dropdown in the left sidebar to update job progress:\n\n• New — job created, not yet scheduled\n• Scheduled — date/time set, tech assigned\n• In Progress — work has started (tech updated on-site)\n• Completed — work done, ready to invoice\n• On Hold — paused (waiting on parts, customer decision, etc.)\n• Cancelled — job won't proceed\n\nStatus changes are logged in the Activity Feed with a timestamp and the name of who made the change."
      },
      {
        title: "Assigning Technicians",
        body: "To assign one or more techs to a job:\n1. Open the Job Detail page\n2. In the left sidebar, find the 'Assigned Techs' field\n3. Click the dropdown and select from your active technicians\n4. Multiple techs can be assigned to the same job\n\nAssigned techs will see this job in their dashboard view and receive a push/email notification if 'Job Scheduled' notifications are enabled."
      },
      {
        title: "Uploading Photos",
        body: "Document your work with before and after photos:\n1. Open the Job Detail → Photos tab\n2. Click 'Upload Before Photos' to add pre-work documentation\n3. Click 'Upload After Photos' to show completed work\n\nPhotos are stored securely and visible to:\n• All staff with company access\n• The customer (via their Customer Portal)\n\nSupported formats: JPG, PNG, HEIC (mobile). Max 10MB per photo."
      },
      {
        title: "Uploading and Processing Receipts",
        body: "Track material costs with receipt uploads:\n1. Open the Job Detail → Receipts tab\n2. Click 'Upload Receipt'\n3. Take a photo or upload from your device\n\nThe system automatically runs OCR to extract:\n• Vendor name\n• Purchase date\n• Line items and amounts\n• Total\n\nReview and confirm the extracted data, then save. Receipts feed into the Job Costing section for margin tracking."
      },
      {
        title: "Setting Up Recurring Jobs",
        body: "For repeat service customers (e.g., bi-weekly lawn care):\n1. Open the Job Detail page\n2. Toggle 'Is Recurring' to ON\n3. Set the recurrence interval: Weekly, Bi-weekly, Monthly, or Quarterly\n4. Save\n\nWhen you mark the current job as Completed, the system automatically creates the next scheduled job with the same customer, address, service type, and technician assignment. You just need to confirm the date."
      }
    ],
    faqs: [
      { q: "Can a job be linked to multiple invoices?", a: "Yes. A job can have multiple invoices — for example, a deposit invoice upfront and a final invoice on completion. Create invoices from the Invoice tab within the Job Detail page." },
      { q: "What's the difference between Internal Notes and Customer Notes?", a: "Internal Notes are only visible to your staff — use these for private communications, instructions to techs, or personal reminders. Customer Notes are visible to the customer in their portal — use these to communicate updates, explain work done, or note any issues." },
      { q: "The OCR on my receipt didn't extract correctly — can I fix it?", a: "Yes. After OCR processing, all extracted fields are editable before saving. Simply click into any field and correct the value. OCR is an aid — always review before saving." },
      { q: "How do I track job profitability?", a: "Open the Job Detail → Costing tab. Here you can log labor hours (with hourly rates) and materials costs. The system compares your costs to the invoiced amount and shows your gross profit and margin %." },
      { q: "Can I print or share a job summary with the customer?", a: "Yes. From the Job Detail page, use the Actions menu to generate a Job Summary PDF. This includes the job description, scheduled date, assigned tech, and any customer-facing notes. It does not include internal notes." }
    ]
  },
  {
    id: "schedule",
    label: "Schedule",
    colorClass: "bg-cyan-100 text-cyan-700",
    tag: "All Users",
    summary: "Visual calendar view of all scheduled jobs. Drag and drop to reschedule.",
    screenshot: {
      placeholder: "Weekly calendar view with color-coded job blocks per technician, day/week/month toggle",
      caption: "The Schedule calendar — drag any job to reschedule, filtered by technician color."
    },
    steps: [
      {
        title: "Navigating the Calendar",
        body: "The Schedule page opens in Week view by default. Use the view selector (top right) to switch:\n• Day View — single day, hour-by-hour slots, best for daily dispatch\n• Week View — Mon–Sun layout, best for weekly planning\n• Month View — full month overview, best for long-range planning\n\nUse the arrow buttons (< >) to move forward/backward in time. Click 'Today' to jump back to the current date."
      },
      {
        title: "Reading Job Blocks",
        body: "Each job appears as a colored block on the calendar. The color corresponds to the assigned technician's color (set in their Team profile).\n\nThe block shows:\n• Job title\n• Customer name\n• Time range\n\nHover over a block for a tooltip with more details. Click the block to open the full Job Detail page."
      },
      {
        title: "Drag and Drop Rescheduling",
        body: "To reschedule a job:\n1. Click and hold the job block\n2. Drag it to the new date/time slot\n3. Release to drop\n\nThe job's Scheduled Start and Scheduled End will update automatically. The assigned technician will receive a reschedule notification if notifications are enabled.\n\nNote: You cannot drag jobs between weeks in Month view — switch to Week or Day view for precise time-slot dragging."
      },
      {
        title: "Filtering by Technician",
        body: "When you have multiple technicians, the calendar can get busy. Use the technician filter:\n1. Look for the technician filter panel (left sidebar or top toolbar)\n2. Check/uncheck technicians to show/hide their jobs\n3. Selecting a single technician gives you a clean personal view\n\nThis is especially useful during morning dispatch — focus on one tech at a time to confirm their day."
      },
      {
        title: "Creating a Job from the Calendar",
        body: "Instead of going to Jobs → New Job, you can create directly from the calendar:\n1. Click on any empty time slot on the calendar\n2. The New Job form opens with that date and time pre-filled\n3. Fill in the customer and title\n4. Save\n\nThe job will immediately appear on the calendar in the correct slot."
      }
    ],
    faqs: [
      { q: "A job I created isn't showing on the schedule — why?", a: "Jobs only appear on the calendar if they have a Scheduled Start date set. Open the job and add a scheduled start date/time. Also make sure the job status isn't 'Cancelled'." },
      { q: "Can I set up different work hours per technician?", a: "The calendar doesn't currently support per-tech work hour windows. The calendar shows all 24 hours but jobs outside typical business hours will be visually obvious." },
      { q: "Can multiple technicians share a job on the calendar?", a: "Yes. When multiple techs are assigned to a job, the job block appears in each tech's color (or a shared color if there are many). All assigned techs will see the job on their schedule." },
      { q: "Can I print the schedule?", a: "Use your browser's Print function (Ctrl/Cmd+P) while on the Schedule page. For a clean printed view, switch to Day or Week view before printing." }
    ]
  },
  {
    id: "invoices",
    label: "Invoices",
    colorClass: "bg-emerald-100 text-emerald-700",
    tag: "All Users",
    summary: "Create, send, and track invoices. Accept online payments via Stripe.",
    screenshot: {
      placeholder: "Invoice list with status badges (Draft, Sent, Paid, Overdue), customer names, and totals",
      caption: "The Invoices page — full billing management with online payment tracking."
    },
    steps: [
      {
        title: "Creating an Invoice",
        body: "Click 'New Invoice' from the Invoices page or from within a Job Detail.\n\nFill in:\n• Customer (required)\n• Invoice Number — auto-generated, can be customized\n• Due Date — when payment is expected\n• Line Items — services/materials billed\n• Tax Rate — applied to taxable line items\n• Discount — flat amount or percentage\n• Notes — visible to the customer on the invoice\n\nTip: If you're invoicing for a completed job, open the job's Invoice tab and create the invoice from there — line items from the job will pre-fill."
      },
      {
        title: "Invoice Status Flow",
        body: "Invoices move through these statuses:\n\n• Draft — created but not yet sent. Customer cannot see it.\n• Sent — emailed to the customer. A 'Pay Now' button is included if Stripe is connected.\n• Viewed — customer has clicked the invoice link (auto-updated).\n• Paid — full payment received (online or manually recorded).\n• Partial — partial payment recorded, balance still owed.\n• Overdue — due date has passed and not fully paid (auto-flagged).\n• Void — invoice cancelled. Does not affect revenue totals."
      },
      {
        title: "Sending an Invoice by Email",
        body: "To send:\n1. Open or create the invoice\n2. Click 'Send Invoice'\n3. Confirm the customer's email address\n4. Optionally add a personal message\n5. Click Send\n\nThe customer receives a branded email (using your Email Template) with:\n• Invoice summary\n• Line item breakdown\n• Total due\n• 'Pay Now' button (if Stripe is connected)\n• PDF download link"
      },
      {
        title: "Recording a Manual Payment",
        body: "For cash, check, bank transfer, or other offline payments:\n1. Open the Invoice Detail\n2. Click 'Record Payment'\n3. Enter the amount paid, payment method, and date\n4. Click Save\n\nIf the amount equals the invoice total, the status changes to 'Paid'. If partial, it changes to 'Partial' and shows the remaining balance. You can record multiple partial payments."
      },
      {
        title: "Accepting Online Payments via Stripe",
        body: "If you've connected Stripe (Company Settings → Payments):\n• Every sent invoice includes a 'Pay Now' button\n• Customers are taken to a secure Stripe Checkout page\n• They enter their card details and pay\n• Payment confirmation is sent to both you and the customer\n• Invoice status automatically updates to 'Paid'\n• Funds are deposited to your connected bank account (typically 2 business days)\n\nNote: Stripe charges a transaction fee (usually 2.9% + 30¢). This is deducted from the payout, not added to the customer's total."
      },
      {
        title: "Requesting a Deposit",
        body: "For jobs that require upfront payment:\n1. Open the Job Detail\n2. Click 'Request Deposit' in the Invoice tab\n3. Enter the deposit amount (e.g., 50% of the estimated total)\n4. Send the deposit request\n\nThe customer can pay the deposit online. The remaining balance is billed when the job is complete."
      }
    ],
    faqs: [
      { q: "Can I create an invoice without a job?", a: "Yes. Invoices don't require a linked job. You can create a standalone invoice for any customer for any service or product." },
      { q: "A customer says they paid but the invoice still shows as unpaid — what do I do?", a: "For online Stripe payments, occasionally there's a delay of a few minutes in the webhook update. Refresh the invoice. If it still shows unpaid after 10 minutes, check your Stripe dashboard to confirm payment, then manually record the payment." },
      { q: "Can I void a paid invoice?", a: "Voiding a paid invoice is not recommended as it affects your accounting records. Contact your accountant before voiding paid invoices. If you need to issue a refund, process it through Stripe and record a credit note manually." },
      { q: "How do I apply a discount to a specific line item vs. the whole invoice?", a: "The discount field applies to the overall invoice subtotal. For per-line discounts, simply adjust the unit price of that line item directly." },
      { q: "Can I customize what the invoice looks like when the customer receives it?", a: "Yes — go to Email Templates and set up your Invoice template with your logo, brand colors, and custom footer text." }
    ]
  },
  {
    id: "payments",
    label: "Payments",
    colorClass: "bg-pink-100 text-pink-700",
    tag: "Managers & Admins",
    summary: "View all payment transactions, connect Stripe, and manage financial collections.",
    screenshot: {
      placeholder: "Payments page showing transaction list with method icons, amounts, and invoice links",
      caption: "The Payments page — all transactions in one place with filtering and export."
    },
    steps: [
      {
        title: "Viewing the Payment History",
        body: "The Payments page shows every payment transaction recorded across all invoices for your company. Each row shows:\n• Invoice number (click to open)\n• Customer name\n• Payment amount\n• Payment method (Stripe, Cash, Check, etc.)\n• Date of payment\n• Status\n\nUse the date range picker to filter by period. Use the search bar to find payments by customer name or invoice number."
      },
      {
        title: "Connecting Stripe",
        body: "To accept online payments:\n1. Go to Company Settings → Payments tab\n2. Click 'Connect with Stripe'\n3. You'll be redirected to Stripe to create or link an existing account\n4. Follow the prompts to enter your business details and bank information\n5. Once approved, you'll be redirected back to FieldFlow Pro\n6. The Payments tab will show 'Stripe Connected' status\n\nNow every sent invoice will include a Pay Now button."
      },
      {
        title: "Using Manual Charge",
        body: "If a customer has a card on file and you want to charge them directly without sending an invoice:\n1. Go to the Payments page\n2. Click 'Manual Charge'\n3. Search for the customer\n4. Enter the amount and description\n5. Click Charge\n\nThe customer's saved payment method will be charged and a receipt emailed to them automatically."
      },
      {
        title: "Exporting Payment Data",
        body: "To export payment history for accounting or reporting:\n1. Apply any date range filters you need\n2. Click 'Export CSV' in the toolbar\n3. A CSV file downloads with all visible transactions\n\nThis file is useful for importing into accounting software or sharing with your bookkeeper."
      }
    ],
    faqs: [
      { q: "When do Stripe payouts arrive in my bank account?", a: "Standard Stripe payouts take 2 business days after a payment is made. For new Stripe accounts, the first payout may take 7–14 days while Stripe verifies your business. You can see payout schedules directly in your Stripe dashboard." },
      { q: "Does FieldFlow Pro add any fees on top of Stripe's fees?", a: "No. FieldFlow Pro does not charge any additional transaction fees. You only pay Stripe's standard rates (typically 2.9% + 30¢ per transaction for US cards)." },
      { q: "Can I process refunds through FieldFlow Pro?", a: "Refunds must be processed directly in your Stripe Dashboard. After issuing the refund in Stripe, manually update the invoice status in FieldFlow Pro to reflect the refund." },
      { q: "How do I handle a bounced check?", a: "If a check bounces after you've recorded the payment, open the invoice and record a 'Reversal' by adding a negative manual payment for the same amount. The invoice status will return to Overdue." }
    ]
  },
  {
    id: "notifications",
    label: "Notifications",
    colorClass: "bg-amber-100 text-amber-700",
    tag: "All Users",
    summary: "Configure automated email notifications for jobs, invoices, and more.",
    screenshot: {
      placeholder: "Notifications settings page with toggle switches for each notification type and timing options",
      caption: "Notifications settings — enable automated customer and admin alerts with configurable timing."
    },
    steps: [
      {
        title: "Types of Notifications Available",
        body: "FieldFlow Pro supports these automated notifications:\n\nCustomer-Facing:\n• Appointment Reminder — sent X hours/days before scheduled job\n• Job Completed — sent when job status changes to Completed\n• Invoice Sent — triggered when you send an invoice\n• Invoice Overdue Reminder — sent when invoice passes due date\n• Review Request — sent after job completion asking for a Google review\n• Portal Invite — when you send a customer portal invitation\n\nAdmin/Staff:\n• New Lead — when a lead is submitted via the capture form\n• New Booking — when a customer requests a booking online\n• Payment Received — when an invoice is paid"
      },
      {
        title: "Enabling a Notification",
        body: "1. Go to the Notifications page from the sidebar\n2. Find the notification type you want to enable\n3. Toggle the switch to ON\n4. Configure the timing if applicable (e.g., 'Send 24 hours before appointment')\n5. Preview the email template if available\n6. Save\n\nNotifications will now fire automatically when the trigger condition is met."
      },
      {
        title: "Prerequisites for Email Notifications",
        body: "Before enabling email notifications, make sure:\n1. Company Settings → Email is configured with a valid from address\n2. If using a custom domain, DNS records have been verified\n3. The customer has a valid email address on their record\n\nIf email settings are not configured, notifications will not send. You'll see an 'Email not configured' warning on the Notifications page."
      },
      {
        title: "Customer Notification Preferences",
        body: "Individual customers can manage their own notification preferences in their Customer Portal (Account tab).\n\nThey can opt out of:\n• Email notifications\n• SMS notifications (if enabled)\n• Marketing messages\n\nYour system-level settings are the maximum — if you've enabled appointment reminders and the customer opts out, they won't receive them."
      }
    ],
    faqs: [
      { q: "I enabled appointment reminders but customers aren't receiving them.", a: "Check: 1) Is your company email configured and verified? 2) Does the job have a scheduled_start date set? 3) Does the customer have a valid email address? 4) Check the customer's notification preferences — they may have opted out." },
      { q: "Can I customize the content of notification emails?", a: "Currently, notification email content uses a standard template with your company branding. Full content customization for notification emails is on the product roadmap." },
      { q: "Can I send SMS notifications?", a: "SMS is available if configured. Contact support to enable SMS notifications for your account. A valid phone number must be on the customer's record." },
      { q: "What triggers the review request notification?", a: "A review request is sent automatically when a job's status is changed to 'Completed'. It sends to the customer's email with a link to your Google Review URL (set in Company Settings)." }
    ]
  },
  {
    id: "messages",
    label: "Messages",
    colorClass: "bg-violet-100 text-violet-700",
    tag: "All Users",
    summary: "Two-way messaging between staff and customers, organized by customer and job.",
    screenshot: {
      placeholder: "Messages page with customer list on left, conversation thread on right, and message input at bottom",
      caption: "The Messages inbox — threaded conversations with customers, linked to jobs."
    },
    steps: [
      {
        title: "Navigating the Messages Inbox",
        body: "The Messages page has two panels:\n\nLeft Panel — conversation list:\n• All customers with active message threads appear here\n• Unread threads show a blue dot and bold name\n• Click a customer to open their conversation\n\nRight Panel — conversation thread:\n• All messages between your team and this customer\n• Each message shows sender, timestamp, and content\n• Messages from customers are light-colored; your team's messages are dark"
      },
      {
        title: "Sending a Message",
        body: "1. Find or search for the customer in the left panel\n2. Click their name to open the thread\n3. Type your message in the input box at the bottom\n4. Press Enter or click Send\n\nThe message is delivered to the customer via email. The email subject will be your company name + the customer's name for easy threading."
      },
      {
        title: "How Customer Replies Work",
        body: "When a customer replies to a FieldFlow Pro email (notification, invoice, estimate, or direct message), their reply is automatically captured and added to the Messages thread.\n\nYou don't need a separate email client — all customer replies land in the Messages inbox. You'll see an unread badge in the sidebar nav when new replies arrive."
      },
      {
        title: "Using the AI Assistant for Message Drafting",
        body: "The AI Assistant panel (click the bot icon in the top right) can help you:\n• Draft a reply to a customer message\n• Summarize a customer's job and invoice history\n• Suggest a follow-up message based on job status\n\nType your instruction in the AI panel (e.g., 'Draft a message letting this customer know their job is scheduled for Friday') and the AI will generate a draft. Copy it into the message box and edit as needed."
      }
    ],
    faqs: [
      { q: "Can multiple staff members respond in the same customer thread?", a: "Yes. Any staff member with access to the company can see and reply in any conversation thread. Each message shows who sent it." },
      { q: "Is there a way to tell if the customer has read my message?", a: "Messages are delivered via email, so read receipts depend on the customer's email client. FieldFlow Pro does not track email open rates for messages." },
      { q: "Can I attach files or images to messages?", a: "Currently, messages support text only. For sharing documents (estimates, invoices, PDFs), use the Send feature on those records directly." },
      { q: "A customer replied to an old invoice email and it's not showing up in Messages.", a: "Replies must come through the email address associated with your company's outbound email settings. If your email settings have changed, replies to old emails may not be captured. Always use the current Send button from within the app." }
    ]
  },
  {
    id: "accounting",
    label: "Accounting",
    colorClass: "bg-teal-100 text-teal-700",
    tag: "Managers & Admins",
    summary: "Full double-entry accounting — chart of accounts, transactions, and financial reports.",
    screenshot: {
      placeholder: "Accounting dashboard showing account balances, recent transactions, and P&L summary",
      caption: "The Accounting module — full bookkeeping integrated with your jobs and invoices."
    },
    steps: [
      {
        title: "Activating the Accounting Module",
        body: "The Accounting module is off by default.\n\n1. Navigate to the Accounting page from the sidebar\n2. Click 'Activate Accounting Module'\n3. Set your fiscal year start date (e.g., January 1)\n4. Set your default currency\n5. Click Activate\n\nSystem accounts (Cash, Accounts Receivable, Revenue, etc.) will be created automatically. You can then add custom accounts as needed."
      },
      {
        title: "Understanding the Chart of Accounts",
        body: "The Chart of Accounts (CoA) is a structured list of all your financial accounts. Accounts are organized by type:\n\n• Assets — what you own (Cash, Accounts Receivable, Equipment)\n• Liabilities — what you owe (Accounts Payable, Loans)\n• Equity — owner's equity and retained earnings\n• Revenue — income from services\n• Expenses — costs of running the business\n\nGo to Accounting → Chart of Accounts to view, add, or edit accounts."
      },
      {
        title: "How Transactions Are Created",
        body: "Transactions are created in two ways:\n\nAutomatic:\n• When an invoice is marked Paid, a journal entry is automatically created: Debit Cash / Accounts Receivable, Credit Revenue\n\nManual:\n• Go to Accounting → Transactions\n• Click 'New Transaction'\n• Enter the date, description, and debit/credit account entries\n• Common manual entries: expense payments, bank transfers, payroll\n\nAll transactions must balance (total debits = total credits)."
      },
      {
        title: "Running Financial Reports",
        body: "Access reports from Accounting → Reports:\n\n• Profit & Loss (P&L) — shows revenue vs expenses for a date range\n• Balance Sheet — snapshot of assets, liabilities, and equity at a point in time\n• Cash Flow — movement of cash in and out over a period\n\nFor each report:\n1. Select the date range\n2. Click Generate\n3. Review on screen or click Export CSV\n\nShare the CSV with your accountant or import into tax software."
      },
      {
        title: "Using AI Insights",
        body: "The AI Insights panel analyzes your financial data and surfaces:\n• Revenue trends (growing / declining months)\n• Expense anomalies (unusually high categories)\n• Cash flow warnings (low cash balance periods)\n• Profitability by customer or service type (if data is available)\n\nTo access: Accounting → AI Insights panel (right side of the screen). Insights update automatically as new transactions are recorded."
      }
    ],
    faqs: [
      { q: "Do I need to be an accountant to use this module?", a: "No, but basic bookkeeping knowledge helps. The system guides you through common entries and auto-creates many transactions. For complex tax situations, always consult your accountant — use the Export function to share data with them." },
      { q: "Will old invoices automatically appear in accounting?", a: "Only invoices paid after the accounting module is activated will auto-generate entries. For historical invoices, you may need to create manual journal entries or work with your accountant to enter an opening balance." },
      { q: "Can I track expenses paid by credit card?", a: "Yes. Add your credit card as a Bank Account (Account Type: Credit Card). Record expenses against the credit card account. When you pay the card balance, enter a bank transfer transaction." },
      { q: "How do I handle sales tax in accounting?", a: "When you set a tax rate on an invoice, the tax amount is tracked separately. In the Chart of Accounts, there is a Sales Tax Payable liability account. When you remit tax to the government, record a manual transaction to clear this account." }
    ]
  },
  {
    id: "team",
    label: "Team",
    colorClass: "bg-indigo-100 text-indigo-700",
    tag: "Managers & Admins",
    summary: "Manage your field technicians — profiles, skills, colors, and schedule visibility.",
    screenshot: {
      placeholder: "Team page showing technician cards with photo, color swatch, skills tags, and status badge",
      caption: "The Team page — manage field staff profiles with skills, colors, and account linking."
    },
    steps: [
      {
        title: "Adding a Technician",
        body: "1. Go to Team from the sidebar\n2. Click 'Add Technician'\n3. Fill in:\n   • First and Last Name (required)\n   • Email — used for login if linked to a user account\n   • Phone — for dispatch communication\n   • Color — pick a unique color for the schedule calendar\n   • Skills — add tags like 'Plumbing', 'HVAC', 'Electrical'\n   • Status — Active, Inactive, or On Leave\n4. Click Save\n\nThe technician will now appear in job assignment dropdowns and on the schedule calendar."
      },
      {
        title: "Choosing Technician Colors",
        body: "Colors are critical for schedule readability. Assign a distinct color to each tech so you can instantly identify whose jobs are whose on the calendar.\n\nBest practices:\n• Use high-contrast colors (avoid very light pastels)\n• Don't assign the same color to two techs\n• Consider using your company brand palette\n\nColors can be updated anytime from the technician's profile without affecting historical records."
      },
      {
        title: "Setting Skills and Specializations",
        body: "Skills tags help dispatchers match the right tech to each job.\n\nTo add skills:\n1. Open the Technician profile\n2. Click in the Skills field\n3. Type a skill name and press Enter to add it as a tag\n4. Add as many as needed\n\nWhen creating a job, you can filter the technician dropdown by skill to find qualified staff quickly."
      },
      {
        title: "Linking a Technician to a User Account",
        body: "If a technician logs into FieldFlow Pro to view their schedule and update jobs:\n1. Go to the Employees page (Admin section)\n2. Invite the person as an employee with Standard role\n3. On their Technician profile, the system will link their user account automatically once they accept the invite and log in\n\nLinked techs see their personalized schedule view and can update job statuses from the field."
      },
      {
        title: "Managing Technician Availability",
        body: "Use the Status field to manage availability:\n• Active — available for assignment\n• On Leave — temporarily unavailable (vacation, sick leave). They still appear in the system but won't be offered in assignment dropdowns.\n• Inactive — no longer with the company. Historical job assignments remain but they're hidden from new job forms."
      }
    ],
    faqs: [
      { q: "Can a technician see all company data or only their own jobs?", a: "Technicians with a Standard User role only see jobs assigned to them on their dashboard. They can view and update those jobs but cannot access financial data, customer lists, or admin settings." },
      { q: "What happens to a tech's scheduled jobs if I mark them as Inactive?", a: "Existing job assignments remain — the jobs still show on the calendar. You'll want to manually reassign those jobs to another tech. Inactive techs just won't appear as options when creating new job assignments." },
      { q: "Can I have more technicians than user seats on my plan?", a: "Yes. Technician records don't require a user account. You can have 20 technicians on the Team page but only 5 with user login access, for example. Only techs who need to log in count toward your plan's user limit." },
      { q: "How do I track hours worked per technician?", a: "Use the Job Costing section on each job to log labor hours per technician. Aggregate reports on labor costs by technician are available in the Reports section." }
    ]
  },
  {
    id: "pricebook",
    label: "Price Book",
    colorClass: "bg-rose-100 text-rose-700",
    tag: "Managers & Admins",
    summary: "Maintain a catalog of your services and materials with standard pricing.",
    screenshot: {
      placeholder: "Price Book page with categorized items list, search bar, and Add Item button. Item cards show name, unit price, and category badge.",
      caption: "The Price Book — your complete service and materials catalog for fast, consistent estimating."
    },
    steps: [
      {
        title: "Adding a Price Book Item",
        body: "1. Go to Price Book from the sidebar\n2. Click 'Add Item'\n3. Fill in:\n   • Name — descriptive item name (e.g., 'Interior Wall Painting - per sqft')\n   • Item Type — Service or Material\n   • Category — top-level grouping (e.g., 'Labor', 'Paint', 'Lumber')\n   • Subcategory — optional further grouping\n   • Unit Price — your standard selling price\n   • Unit Type — Flat, Hourly, Per Sqft, Per Unit, Per Lb, Per Ft, Each\n   • SKU — optional part/vendor code\n   • Taxable — yes/no\n4. Click Save"
      },
      {
        title: "Organizing with Categories",
        body: "Well-organized categories make estimate-building much faster. Recommended structure:\n\nServices:\n• Labor (subcat: Regular, Overtime, Specialty)\n• Installation (subcat: by trade)\n• Inspection, Consultation, Design\n\nMaterials:\n• By material type (Lumber, Plumbing Supplies, Electrical, Paint)\n• By vendor or brand if relevant\n\nWhen adding items to an estimate, you can browse by category or search by name. Good categories = less time searching."
      },
      {
        title: "Using Price Book Items in Estimates and Invoices",
        body: "When building an estimate or invoice:\n1. Click 'Add Line Item'\n2. Select 'From Price Book'\n3. A picker panel opens — search or browse by category\n4. Click the item you want to add\n5. The line item pre-fills with the name, unit price, and unit type\n6. Adjust the quantity and price as needed for this specific job\n\nChanges made in the estimate/invoice do NOT update the price book. Each job's pricing is independent."
      },
      {
        title: "Bulk Importing Items",
        body: "If you have a large existing catalog:\n1. Go to Price Book → Import\n2. Download the CSV template\n3. Fill in your items following the template format\n4. Upload the completed CSV\n5. Review the import preview\n6. Confirm import\n\nSupported formats: CSV, Excel (.xlsx). Maximum 500 items per import batch."
      },
      {
        title: "Managing and Retiring Items",
        body: "Over time, pricing changes and some items become obsolete.\n\nTo update pricing:\n• Click the item → edit the unit price → save\n• This updates the price book but doesn't affect any existing estimates or invoices\n\nTo retire an item (stop it showing in the picker but keep historical records):\n• Open the item → toggle 'Active' to OFF → save\n• Inactive items no longer appear in the estimate/invoice picker but remain linked to any historical records"
      }
    ],
    faqs: [
      { q: "If I update a price in the Price Book, will it change existing estimates?", a: "No. Price Book prices are only applied at the moment you add them to an estimate or invoice. Existing estimates and invoices keep whatever price was set at the time of creation." },
      { q: "Can I have different prices for different customers or companies?", a: "Currently, the Price Book uses a single price per item per company. For customer-specific pricing, simply adjust the unit price when adding it to that customer's estimate." },
      { q: "What's the difference between a Service and a Material item type?", a: "Service items represent labor and work performed (e.g., Installation, Consultation, Painting). Material items represent physical goods (e.g., Paint, Lumber, PVC Pipe). The distinction is used for margin tracking and accounting categorization." },
      { q: "Can I import my existing pricing from QuickBooks or another system?", a: "If your existing system can export a CSV, you can map that data to the Price Book import template. The key columns needed are: name, item_type, category, unit_price, unit." }
    ]
  },
  {
    id: "settings",
    label: "Company Settings",
    colorClass: "bg-slate-100 text-slate-700",
    tag: "Admins Only",
    summary: "Configure your company profile, email, payments, billing, and customer portal.",
    screenshot: {
      placeholder: "Company Settings page with tab bar (Company, Email, Payments, Billing, Portal) and form fields",
      caption: "Company Settings — the control center for your account configuration."
    },
    steps: [
      {
        title: "Company Tab — Profile & Branding",
        body: "This is the first thing to set up:\n• Company Name — appears on all estimates, invoices, and emails\n• Logo URL — paste a publicly hosted image URL (e.g., from your website or a cloud storage link)\n• Primary Color — hex code for your brand color. Used in email templates and the portal.\n• Industry — used for AI estimator suggestions\n• Contact Info — phone, email, address, website\n• Default Tax Rate — applied automatically to new invoices\n• Google Review URL — used in post-job review request emails\n\nClick Save after making changes."
      },
      {
        title: "Email Tab — Outbound Email Setup",
        body: "Configure how emails are sent from FieldFlow Pro:\n\nDefault (no setup required):\nEmails are sent from a FieldFlow Pro system address. Easy to start but may land in spam.\n\nCustom Domain (recommended):\n1. Click 'Add Custom Domain'\n2. Enter your domain (e.g., yourdomain.com)\n3. Copy the DNS records shown\n4. Add those records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)\n5. Click 'Verify'\n6. Once verified, emails send from yourname@yourdomain.com\n\nVerification can take 5–60 minutes depending on your DNS provider."
      },
      {
        title: "Payments Tab — Stripe Connection",
        body: "To accept online payments:\n1. Click 'Connect with Stripe'\n2. You'll be redirected to Stripe's secure OAuth page\n3. Log in to your existing Stripe account or create a new one\n4. Follow the prompts to verify your business and add a bank account\n5. Stripe will redirect you back to FieldFlow Pro\n6. The tab will show 'Stripe Connected' with your account ID\n\nOnce connected, all sent invoices will include a Pay Now button. Payouts are managed directly in your Stripe dashboard."
      },
      {
        title: "Billing Tab — Subscription Management",
        body: "View and manage your FieldFlow Pro subscription:\n• Current Plan — Starter / Professional / Enterprise\n• Status — Active, Trialing, Past Due, Cancelled\n• Next Billing Date — when your next charge occurs\n• 'Manage Billing' button — opens Stripe's secure billing portal where you can:\n  - Update payment method\n  - Download past invoices\n  - Upgrade or downgrade plan\n  - Cancel subscription\n\nBilling is handled entirely by Stripe — FieldFlow Pro does not store card numbers."
      },
      {
        title: "Portal Tab — Customer Portal Settings",
        body: "Configure the customer self-service portal:\n• Enable/Disable Portal — toggle customer portal access on/off\n• Auto-Send Invite — automatically send portal invite when a customer is created\n• Include Portal Link — include the portal link in estimate and invoice emails\n• Referral Feature — enable/disable the customer referral program\n• Referral Message — customize the message shown to customers for referrals"
      },
      {
        title: "Margin Rules Tab",
        body: "Set pricing guardrails for estimates:\n• Default Minimum Markup % — e.g., 30% means all items must be priced at least 30% above cost\n• Labor Markup Override — separate minimum for labor line items\n• Materials Markup Override — separate minimum for material line items\n• Minimum Total Amount — minimum dollar threshold for any estimate\n• Auto-Approve — if estimates pass margin review, skip manual manager approval\n\nMargin rules help ensure every job is profitable before you send the quote."
      }
    ],
    faqs: [
      { q: "My logo isn't showing on estimates and invoices — why?", a: "The logo must be a publicly accessible URL (starts with https://). If it's behind a login or on your local computer, it won't load. Host your logo on a service like Google Drive (with public sharing), Dropbox, or your own website." },
      { q: "I connected Stripe but invoices don't have a Pay Now button.", a: "Make sure the invoice is in 'Sent' status (not Draft). Also verify that the Stripe connection is active — go to Settings → Payments and confirm the connected status. If recently connected, try resending the invoice." },
      { q: "Can I have multiple email addresses for outbound emails?", a: "Currently, each company has one outbound email address configured. If you need multiple brands or senders, use sub-companies — each sub-company can have its own email settings." },
      { q: "How do I cancel my subscription?", a: "Go to Company Settings → Billing → Manage Billing. In the Stripe portal, select Cancel Subscription. Your access continues until the end of the current billing period." },
      { q: "I set up my custom email domain but it's not sending.", a: "DNS changes can take up to 24 hours to propagate. If it's been more than 24 hours, double-check that you added all the required DNS records exactly as shown. Contact support if the issue persists." }
    ]
  },
  {
    id: "employees",
    label: "Employees",
    colorClass: "bg-lime-100 text-lime-700",
    tag: "Admins Only",
    summary: "Invite staff, assign company access, manage roles, and maintain employee profiles.",
    screenshot: {
      placeholder: "Employees page showing staff cards with email, role badge, company access checkboxes, and invite button",
      caption: "The Employees page — manage who can access FieldFlow Pro and which companies they see."
    },
    steps: [
      {
        title: "Inviting a New Employee",
        body: "1. Click 'Invite Employee' (top right)\n2. Fill in:\n   • Name — their display name\n   • Email Address — where the invite will be sent\n   • Role — Standard or Manager\n   • Assign to Companies — check all companies they need access to\n   • Add to Team — if they're a field tech, check this to create a Technician record simultaneously\n3. Click 'Invite & Assign'\n\nThe employee receives an email invitation with a secure link to set up their password. Once they complete registration, they can log in and see their assigned companies."
      },
      {
        title: "Understanding Roles",
        body: "FieldFlow Pro has two staff roles:\n\nStandard:\n• Access to Jobs, Customers, Estimates, Invoices, Schedule, Messages\n• Can create and edit records\n• Cannot access Settings, Billing, Reports, or Employee Management\n• Only sees data for assigned companies\n\nManager:\n• Everything Standard can do\n• Full access to Company Settings, Reports, Accounting, Team, Price Book\n• Can invite and manage other employees\n• Still only sees assigned companies (not all companies like an Admin)\n\nAdmins (Super Admins) are platform-level and cannot be assigned from this page."
      },
      {
        title: "Assigning Company Access",
        body: "Each employee can be assigned to one or multiple companies.\n\nTo update access:\n1. Find the employee card on the Employees page\n2. In the Company Access section, check or uncheck companies\n3. Changes take effect immediately — no save button needed\n\nAn employee without any company assigned cannot see any data after logging in."
      },
      {
        title: "Updating Employee Profiles",
        body: "Click the pencil (edit) icon on any employee card to update:\n• Job Title and Department\n• Start Date\n• Work Phone\n• Address (city, state, zip)\n• Bio / Internal Notes\n• Emergency Contact Name and Phone\n• Account Active toggle (deactivate without deleting)\n\nThis information is visible to admins and managers, and to the employee themselves via their User Profile page."
      },
      {
        title: "Removing an Employee",
        body: "To revoke access:\n1. Click the trash icon (🗑) on the employee card\n2. Confirm the removal\n\nThis removes all company access records for that employee. They will not be able to log in and see any company data.\n\nImportant: This does NOT delete the employee's user account or any historical data (jobs they were assigned to, notes they wrote, etc.). It only revokes access.\n\nConsider toggling 'Account Active' to OFF instead of removing — this preserves the record while blocking login."
      }
    ],
    faqs: [
      { q: "The employee says they didn't receive the invite email.", a: "Check the email address is correct. Ask them to check spam/junk. You can resend the invite using the Resend Invite button on their employee card. If they still don't receive it, verify your company email settings are configured." },
      { q: "Can an employee be assigned to all companies at once?", a: "Yes — check all company boxes when inviting or editing. For businesses with many sub-companies, this saves time during onboarding." },
      { q: "What's the difference between a Manager role and an Admin?", a: "Manager is a company-level role — they can manage their assigned companies fully but cannot manage the platform itself. Admin (Super Admin) is a platform-level role set by FieldFlow Pro staff — they can see all companies and have unrestricted access." },
      { q: "Can I change an employee's role after they've been invited?", a: "Yes. The role dropdown on the employee card can be changed at any time. The change takes effect immediately on the employee's next page load." },
      { q: "An employee left the company. Should I delete or deactivate them?", a: "We recommend deactivating (toggle Account Active to OFF) rather than removing. This preserves all their historical work (jobs assigned, notes, etc.) while preventing login. If you remove them entirely, the association between their name and past work is lost." }
    ]
  },
  {
    id: "customer-portal",
    label: "Customer Portal",
    colorClass: "bg-fuchsia-100 text-fuchsia-700",
    tag: "Customers",
    summary: "A self-service portal where customers view jobs, approve estimates, pay invoices, and manage their account.",
    screenshot: {
      placeholder: "Customer Portal home screen with Welcome banner, open jobs count, pending estimates, and outstanding invoices summary",
      caption: "The Customer Portal — a professional self-service experience for your clients."
    },
    steps: [
      {
        title: "How Customers Access the Portal",
        body: "Customers access the portal via a unique secure link:\n\n1. You send a Portal Invite from the Customer Detail page\n2. The customer receives an email with 'Access Your Account' link\n3. They click the link and are prompted to set up a password\n4. After logging in, they land on their personal portal\n\nThe portal URL is: [your-app-url]/CustomerPortal\n\nCustomers only see their own data — jobs, estimates, invoices tied to their customer record."
      },
      {
        title: "Portal Home Tab",
        body: "The Home tab gives customers an at-a-glance summary:\n• Open Jobs — current jobs in progress or scheduled\n• Pending Estimates — estimates waiting for their approval\n• Outstanding Invoices — unpaid invoices with amounts due\n• Recent Activity — last few updates across all records\n\nQuick action buttons let them message your team, or navigate to any section quickly."
      },
      {
        title: "Reviewing and Approving Estimates",
        body: "From the Estimates tab:\n1. Customer sees all estimates sent to them\n2. Click an estimate to open the full view\n3. Review line items, total, and notes from your team\n4. For multi-option estimates, select preferred package\n5. Click 'Approve' to accept or 'Decline' to reject\n\nOnce approved, you receive a notification and the estimate status updates in FieldFlow Pro automatically. No manual follow-up needed."
      },
      {
        title: "Viewing Jobs and Photos",
        body: "From the Jobs tab:\n• See all jobs — scheduled, in progress, and completed\n• Click any job to view details including:\n  - Description and service type\n  - Scheduled date\n  - Assigned technician name\n  - Job status\n  - Before/after photos uploaded by your team\n  - Customer-facing notes\n\nCustomers cannot edit jobs — this is a read-only view."
      },
      {
        title: "Viewing and Paying Invoices",
        body: "From the Invoices tab:\n1. All invoices are listed with status and amount\n2. Click an invoice to view the full breakdown\n3. For unpaid invoices with Stripe connected:\n   • Click 'Pay Now'\n   • Enter card details on the secure Stripe Checkout page\n   • Payment confirmation is sent to both parties\n4. Download PDF of any invoice for records\n\nCustomers can also pay partial amounts if your business accepts partial payments."
      },
      {
        title: "Managing Account Settings in the Portal",
        body: "From the Account tab, customers can:\n• Update contact information (phone, email, address)\n• Manage service addresses\n• Set notification preferences:\n  - Enable/disable email notifications\n  - Enable/disable SMS (if available)\n  - Opt out of marketing messages\n\nChanges here update the customer's record in FieldFlow Pro in real time."
      }
    ],
    faqs: [
      { q: "Can a customer access jobs from multiple service addresses?", a: "Yes. If a customer has multiple service addresses and jobs at each, all jobs appear in their portal regardless of address." },
      { q: "A customer approved an estimate in the portal but I didn't get a notification.", a: "Check your admin notification settings — make sure 'Estimate Approved' notifications are enabled. Also check the Estimates page for the updated status." },
      { q: "Can I preview what a customer sees in the portal?", a: "Yes. Go to the Customer Detail page and click 'Preview Portal' (or a similar 'View as Customer' option). This opens a read-only staff preview of that customer's portal view." },
      { q: "Is the customer portal secure?", a: "Yes. Each customer has their own login credentials. Sessions are secured with authentication tokens. Customers can only see their own data — there is no way for one customer to see another's records." },
      { q: "Can I disable the portal for specific customers?", a: "You can disable the portal globally in Company Settings → Portal tab. For per-customer disabling, simply don't send them a portal invite. Customers who haven't received an invite cannot access the portal." }
    ]
  }
];