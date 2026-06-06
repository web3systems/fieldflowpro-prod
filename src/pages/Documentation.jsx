import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  UserPlus, Settings, Building2, CalendarDays, Bell, MessageCircle,
  Calculator, Wrench, BookOpen, Mail, CreditCard, BarChart3,
  ChevronRight, Search, ChevronDown, ChevronUp, Home, Globe,
  ShieldCheck, Zap, Star, CheckCircle, ArrowRight, HelpCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const sections = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    color: "bg-blue-100 text-blue-700",
    tag: "All Users",
    summary: "Your home base. See everything at a glance — jobs, revenue, leads, and today's schedule.",
    content: [
      {
        heading: "Overview",
        body: "The Dashboard gives you a real-time snapshot of your business. When you log in, you'll land here and see key metrics, active jobs, and recent activity tailored to your role."
      },
      {
        heading: "Key Metrics Cards",
        body: "At the top, you'll see cards showing Total Revenue, Active Jobs, New Leads, and Pending Invoices. These update live as data changes across the platform."
      },
      {
        heading: "Revenue Chart",
        body: "The revenue chart shows your income over the selected time period. Hover over any bar or point to see exact figures. Use the period switcher to view weekly, monthly, or yearly data."
      },
      {
        heading: "Active Jobs List",
        body: "Scroll down to see jobs that are currently in-progress or scheduled. Click any job to open the full Job Detail view. Technicians will only see jobs assigned to them."
      },
      {
        heading: "Upcoming Schedule",
        body: "Today's scheduled jobs appear in a timeline format. This helps dispatchers and field staff know what's happening without navigating to the Schedule page."
      },
      {
        heading: "Tips",
        body: "• Admins see company-wide data; standard users see data relevant to their assigned companies.\n• The Onboarding Banner at the top guides new accounts through setup steps.\n• Use the quick-action buttons to create a new job or customer directly from the dashboard."
      }
    ]
  },
  {
    id: "leads",
    icon: UserPlus,
    label: "Leads",
    color: "bg-green-100 text-green-700",
    tag: "All Users",
    summary: "Capture, track, and convert potential customers into paying clients.",
    content: [
      {
        heading: "Overview",
        body: "Leads are potential customers who have expressed interest but haven't yet been converted. You can capture leads manually, via the embeddable Lead Capture form, or through the booking widget."
      },
      {
        heading: "Lead List",
        body: "The Leads page shows all leads with their status (New, Contacted, Qualified, Converted, Lost), source, and assigned rep. Use the search and filter toolbar to narrow down the list."
      },
      {
        heading: "Lead Detail",
        body: "Click any lead to open their detail page. Here you can log activity, add notes, schedule follow-ups, and convert the lead to a Customer when they're ready."
      },
      {
        heading: "Converting a Lead",
        body: "On the Lead Detail page, click 'Convert to Customer'. This creates a new Customer record pre-filled with the lead's information and marks the lead as Converted."
      },
      {
        heading: "Lead Capture Form",
        body: "Use the Embed Code button to get an iframe snippet you can paste into your website. When visitors fill it out, leads are automatically created in your account."
      },
      {
        heading: "Tips",
        body: "• Assign leads to specific team members to track accountability.\n• Use tags and source tracking to measure which marketing channels drive the most leads.\n• Set up automated follow-up reminders in the Notifications settings."
      }
    ]
  },
  {
    id: "customers",
    icon: Users,
    label: "Customers",
    color: "bg-purple-100 text-purple-700",
    tag: "All Users",
    summary: "Manage your full customer database — contact info, history, addresses, and portal access.",
    content: [
      {
        heading: "Overview",
        body: "The Customers page is your CRM. Every homeowner or business you work with lives here. You can store contact details, service addresses, notes, and more."
      },
      {
        heading: "Adding a Customer",
        body: "Click 'Add Customer' and fill in the form. Required: Company ID is auto-set. You can specify if they're a Homeowner or Business, add multiple service addresses, and set communication preferences."
      },
      {
        heading: "Customer Detail",
        body: "Click any customer to open their profile. You'll see all their jobs, estimates, invoices, and messages in one place. Use the tabs to navigate between sections."
      },
      {
        heading: "Service Addresses",
        body: "Customers can have multiple service addresses (e.g., a homeowner with a second property). Add addresses in the Addresses tab of the Customer Detail page."
      },
      {
        heading: "Customer Portal Invite",
        body: "Send customers an invite to the self-service Customer Portal where they can view jobs, approve estimates, and pay invoices. Use the 'Send Portal Invite' button on the customer profile."
      },
      {
        heading: "Tasks & Notes",
        body: "Internal tasks and notes can be added to any customer record. These are staff-only and won't be visible to the customer."
      },
      {
        heading: "Tips",
        body: "• Use the Status field (Active/Inactive/Lead) to keep your list clean.\n• The Total Revenue field auto-updates when invoices are marked paid.\n• You can filter customers by source, status, or tag using the filter toolbar."
      }
    ]
  },
  {
    id: "estimates",
    icon: FileText,
    label: "Estimates",
    color: "bg-yellow-100 text-yellow-700",
    tag: "All Users",
    summary: "Create professional multi-option estimates, send them to customers, and track approvals.",
    content: [
      {
        heading: "Overview",
        body: "Estimates let you quote work before it begins. You can create single or multi-option estimates, set validity dates, and send them directly to customers for digital approval."
      },
      {
        heading: "Creating an Estimate",
        body: "Click 'New Estimate'. Choose a customer, add a title, then build your line items. You can pull items from your Price Book or enter custom descriptions. Set tax rate and any discount."
      },
      {
        heading: "Multi-Option Estimates",
        body: "You can add multiple options to a single estimate (e.g., Basic, Standard, Premium). The customer can choose which option they want when reviewing the estimate online."
      },
      {
        heading: "Sending an Estimate",
        body: "Once ready, click 'Send'. The customer receives an email with a link to view and approve the estimate. The status changes to 'Sent' and updates to 'Approved' or 'Declined' based on their response."
      },
      {
        heading: "Margin Review",
        body: "If your company has Margin Rules configured, estimates will show a margin review panel before sending. This ensures your pricing meets the minimum markup requirements."
      },
      {
        heading: "Converting to Job/Invoice",
        body: "Once an estimate is approved, use the 'Convert to Job' or 'Create Invoice' buttons to continue the workflow without re-entering data."
      },
      {
        heading: "Tips",
        body: "• Use the AI Estimator to get a pre-built estimate based on a job description.\n• Estimates expire after the Valid Until date — send reminders before expiry.\n• PDF download is available for any estimate."
      }
    ]
  },
  {
    id: "jobs",
    icon: Briefcase,
    label: "Jobs",
    color: "bg-orange-100 text-orange-700",
    tag: "All Users",
    summary: "Track every job from creation to completion — assign techs, log notes, upload photos.",
    content: [
      {
        heading: "Overview",
        body: "Jobs are the core unit of work in FieldFlow Pro. Each job tracks its status, assigned technicians, schedule, photos, receipts, notes, and financial totals."
      },
      {
        heading: "Creating a Job",
        body: "Click 'New Job'. Link it to a customer (required), add a title, service type, and schedule dates. You can also link it to an approved estimate to pre-fill line items."
      },
      {
        heading: "Job Statuses",
        body: "Jobs flow through: New → Scheduled → In Progress → Completed. You can also mark jobs as On Hold or Cancelled. The status affects which dashboard metrics the job contributes to."
      },
      {
        heading: "Assigning Technicians",
        body: "In the Job Sidebar, use the 'Assign Tech' dropdown to assign one or more technicians. Assigned techs will see the job in their dashboard view and receive schedule notifications."
      },
      {
        heading: "Photos & Receipts",
        body: "Upload before/after photos and material receipts directly on the job. Receipt images are processed with OCR to extract vendor, date, and total automatically."
      },
      {
        heading: "Notes",
        body: "There are two note types: Internal Notes (staff only) and Customer Notes (visible to customer in their portal). Both maintain a timestamped log."
      },
      {
        heading: "Recurring Jobs",
        body: "Mark a job as recurring and set the interval (weekly, biweekly, monthly, quarterly). The system will automatically create the next job instance when the current one is completed."
      },
      {
        heading: "Tips",
        body: "• Use the Checklist section to create a standardized work checklist for techs.\n• Job cost tracking is available in the Costing section — track labor and material costs vs revenue.\n• Field techs can update job status and upload photos from mobile."
      }
    ]
  },
  {
    id: "schedule",
    icon: CalendarDays,
    label: "Schedule",
    color: "bg-cyan-100 text-cyan-700",
    tag: "All Users",
    summary: "Visual calendar view of all scheduled jobs. Drag and drop to reschedule.",
    content: [
      {
        heading: "Overview",
        body: "The Schedule page shows all jobs on a calendar. Switch between Day, Week, and Month views to get the right perspective for dispatching and planning."
      },
      {
        heading: "Viewing Jobs",
        body: "Each job appears as a colored block based on the assigned technician's color. Hover over a job to see a quick summary. Click it to open the full Job Detail."
      },
      {
        heading: "Drag & Drop Rescheduling",
        body: "Drag any job block to a new time slot or date to reschedule it. The job's scheduled_start and scheduled_end will update automatically."
      },
      {
        heading: "Filtering by Technician",
        body: "Use the technician filter at the top to show only jobs assigned to specific team members. This is useful when dispatching for a single tech."
      },
      {
        heading: "Creating Jobs from the Calendar",
        body: "Click on any empty time slot to open the New Job form pre-filled with that date and time."
      },
      {
        heading: "Tips",
        body: "• Assign a unique color to each technician in their profile for easy visual identification.\n• The Schedule page respects your company's timezone settings.\n• Unscheduled jobs won't appear on the calendar — always set a scheduled_start date."
      }
    ]
  },
  {
    id: "invoices",
    icon: DollarSign,
    label: "Invoices",
    color: "bg-emerald-100 text-emerald-700",
    tag: "All Users",
    summary: "Create, send, and track invoices. Accept online payments via Stripe.",
    content: [
      {
        heading: "Overview",
        body: "Invoices are created once work is complete (or in advance for deposits). They can be sent via email, paid online, or recorded as cash/check payments."
      },
      {
        heading: "Creating an Invoice",
        body: "Click 'New Invoice'. Link to a customer and optionally a job or estimate. Add line items (or import from a job), set the tax rate, discount, and due date."
      },
      {
        heading: "Invoice Statuses",
        body: "Draft → Sent → Viewed → Paid (or Overdue if past due date). The system auto-marks invoices as Overdue based on the due date."
      },
      {
        heading: "Sending an Invoice",
        body: "Click 'Send' to email the invoice to the customer. They'll receive a link to view the invoice and pay online via Stripe (if your Stripe account is connected)."
      },
      {
        heading: "Recording Payments",
        body: "For cash, check, or other offline payments, use the 'Record Payment' button. You can record partial payments — the invoice status will show 'Partial' until fully paid."
      },
      {
        heading: "Online Payments",
        body: "When a customer pays online, Stripe processes the payment and the invoice status automatically updates to 'Paid'. Funds are deposited to your connected bank account."
      },
      {
        heading: "PDF & Export",
        body: "Download a PDF of any invoice for printing or records. Use the CSV export to download all invoices for accounting purposes."
      },
      {
        heading: "Tips",
        body: "• Set up your Email Templates to give invoices a professional branded look.\n• The Deposit Request feature lets you charge a partial amount upfront before starting a job.\n• Overdue invoices can trigger automated reminder emails via Notification Settings."
      }
    ]
  },
  {
    id: "payments",
    icon: CreditCard,
    label: "Payments",
    color: "bg-pink-100 text-pink-700",
    tag: "Managers & Admins",
    summary: "View all payment transactions, Stripe payouts, and financial summaries.",
    content: [
      {
        heading: "Overview",
        body: "The Payments page shows a history of all payment transactions across your invoices — both online (Stripe) and manually recorded payments."
      },
      {
        heading: "Payment History",
        body: "Each row shows the invoice number, customer, amount, payment method, and date. Click a row to navigate to the related invoice."
      },
      {
        heading: "Stripe Integration",
        body: "To accept online payments, connect your Stripe account in Company Settings → Payments. Once connected, a 'Pay Now' link will appear on emailed invoices."
      },
      {
        heading: "Manual Charge",
        body: "If you have a customer's card on file, use the 'Manual Charge' button to charge them directly without sending an invoice payment link."
      },
      {
        heading: "Tips",
        body: "• Stripe payouts typically arrive in your bank account within 2 business days.\n• Refunds must be processed directly in your Stripe dashboard.\n• Use the Export feature to download payment data for your accountant."
      }
    ]
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    color: "bg-amber-100 text-amber-700",
    tag: "All Users",
    summary: "Configure automated email/SMS notifications for jobs, invoices, and more.",
    content: [
      {
        heading: "Overview",
        body: "Notifications let you automate customer communications — appointment reminders, invoice reminders, job completion follow-ups, and review requests."
      },
      {
        heading: "Setting Up Notifications",
        body: "Go to the Notifications page and toggle which notifications you want active. Each notification type has configurable timing (e.g., send 24 hours before scheduled job)."
      },
      {
        heading: "Customer Notifications",
        body: "Customers can manage their own notification preferences in their Customer Portal. They can opt in/out of SMS and email notifications independently."
      },
      {
        heading: "Admin Notifications",
        body: "Admins receive notifications for new leads, new bookings, and payment received events. Configure these in the Notification Settings section."
      },
      {
        heading: "Tips",
        body: "• Make sure your Email Settings are configured (Company Settings → Email) before enabling email notifications.\n• SMS notifications require a verified phone number on the customer record.\n• Review requests are sent after a job is marked as Completed."
      }
    ]
  },
  {
    id: "messages",
    icon: MessageCircle,
    label: "Messages",
    color: "bg-violet-100 text-violet-700",
    tag: "All Users",
    summary: "Two-way messaging between staff and customers, organized by customer/job.",
    content: [
      {
        heading: "Overview",
        body: "The Messages page is your inbox for all customer communications. Conversations are organized by customer and linked to specific jobs where relevant."
      },
      {
        heading: "Sending a Message",
        body: "Select a customer from the left panel and type in the message box. Messages are delivered via email to the customer. Their replies come back into this thread."
      },
      {
        heading: "Customer Replies",
        body: "When a customer replies to any email from FieldFlow Pro, their response is captured and appears in the Messages thread. No separate email client needed."
      },
      {
        heading: "AI Assistant",
        body: "Use the AI chat panel to draft messages, get answers about a customer's history, or generate a follow-up message suggestion."
      },
      {
        heading: "Tips",
        body: "• Unread messages show a badge count in the sidebar.\n• Messages can be filtered by job to see all communications related to a specific project.\n• Staff-only internal notes are separate from customer-visible messages."
      }
    ]
  },
  {
    id: "accounting",
    icon: Calculator,
    label: "Accounting",
    color: "bg-teal-100 text-teal-700",
    tag: "Managers & Admins",
    summary: "Full double-entry accounting — chart of accounts, transactions, bank reconciliation, and reports.",
    content: [
      {
        heading: "Overview",
        body: "The Accounting module is an optional add-on that provides a complete bookkeeping system integrated with your jobs and invoices. Activate it in the Accounting section."
      },
      {
        heading: "Chart of Accounts",
        body: "The Chart of Accounts defines all your account categories (Assets, Liabilities, Equity, Revenue, Expenses). System accounts are pre-created; you can add custom accounts as needed."
      },
      {
        heading: "Transactions",
        body: "All invoice payments automatically create accounting journal entries. You can also manually add transactions for expenses, bank transfers, and other items."
      },
      {
        heading: "Bank Accounts",
        body: "Add your business bank accounts and credit cards to track balances. Reconcile transactions against your bank statements each month."
      },
      {
        heading: "Reports",
        body: "Run Profit & Loss, Balance Sheet, and Cash Flow reports for any date range. Export to CSV for your accountant or tax preparer."
      },
      {
        heading: "AI Insights",
        body: "The AI Insights panel analyzes your financials and surfaces trends, anomalies, and recommendations to help you understand your business better."
      },
      {
        heading: "Tips",
        body: "• Activate Accounting from the Accounting page — it requires a manager or admin role.\n• Set your fiscal year start date in Accounting Settings.\n• Expenses linked to jobs automatically appear as COGS in your P&L."
      }
    ]
  },
  {
    id: "team",
    icon: Wrench,
    label: "Team",
    color: "bg-indigo-100 text-indigo-700",
    tag: "Managers & Admins",
    summary: "Manage your field technicians — profiles, skills, colors, and availability.",
    content: [
      {
        heading: "Overview",
        body: "The Team page manages your Technician records. Technicians are field staff who can be assigned to jobs and appear on the schedule calendar."
      },
      {
        heading: "Adding a Technician",
        body: "Click 'Add Technician'. Fill in their name, email, phone, and assign a color (used on the schedule). Link them to a User account if they log into the system."
      },
      {
        heading: "Skills",
        body: "Add skill tags to each technician (e.g., 'Electrical', 'Plumbing', 'HVAC'). This helps dispatchers assign the right tech to each job."
      },
      {
        heading: "Status",
        body: "Set technician status to Active, Inactive, or On Leave. Inactive and On Leave technicians won't appear in assignment dropdowns on new jobs."
      },
      {
        heading: "Tips",
        body: "• Each technician should have a unique color for easy identification on the schedule.\n• Technicians invited as Users (via the Employees page) can log in and see their assigned jobs.\n• You can create a Technician record without a linked User account for payroll-only tracking."
      }
    ]
  },
  {
    id: "pricebook",
    icon: BookOpen,
    label: "Price Book",
    color: "bg-rose-100 text-rose-700",
    tag: "Managers & Admins",
    summary: "Maintain a catalog of your services and materials with standard pricing.",
    content: [
      {
        heading: "Overview",
        body: "The Price Book is your catalog of standard services and materials. Items here can be quickly added to estimates and invoices without re-entering pricing each time."
      },
      {
        heading: "Adding Items",
        body: "Click 'Add Item'. Set the name, type (Service or Material), category, subcategory, unit price, and unit type (flat, hourly, per sqft, etc.)."
      },
      {
        heading: "Categories & Subcategories",
        body: "Organize items by category (e.g., Lumber, Plumbing, Labor) and subcategory for easy browsing when building estimates."
      },
      {
        heading: "Using in Estimates/Invoices",
        body: "When adding line items to an estimate or invoice, click 'Add from Price Book'. Browse or search the catalog and select items — they'll be added with standard pricing that you can adjust per job."
      },
      {
        heading: "Importing",
        body: "Use the Import feature to bulk-upload price book items from a CSV or Excel file. This is useful when migrating from another system."
      },
      {
        heading: "Tips",
        body: "• Mark items as Inactive instead of deleting them — they'll no longer appear in the picker but historical records won't break.\n• Set taxable=true/false per item to handle tax automatically on invoices.\n• SKU/part number field is available for materials that have vendor codes."
      }
    ]
  },
  {
    id: "settings",
    icon: Settings,
    label: "Company Settings",
    color: "bg-slate-100 text-slate-700",
    tag: "Admins Only",
    summary: "Configure your company profile, email, payments, billing, and customer portal.",
    content: [
      {
        heading: "Company Tab",
        body: "Update your company name, logo, contact info, industry type, primary color, and tax rate. This information appears on estimates, invoices, and customer-facing emails."
      },
      {
        heading: "Email Settings",
        body: "Configure your outbound email sender. You can use FieldFlow's default email or connect your own domain via Resend for branded 'From' addresses. DNS verification steps are provided."
      },
      {
        heading: "Payments (Stripe)",
        body: "Connect your Stripe account to accept online payments. Click 'Connect with Stripe' and follow the OAuth flow. Once connected, invoices will display a Pay Now button."
      },
      {
        heading: "Billing",
        body: "View your FieldFlow Pro subscription status, current plan, and next billing date. Use the 'Manage Billing' button to update your card or cancel your subscription via Stripe's secure portal."
      },
      {
        heading: "Customer Portal",
        body: "Enable or disable the customer portal. Configure whether portal invites are sent automatically and whether the referral feature is active."
      },
      {
        heading: "Margin Rules",
        body: "Set minimum markup percentages for labor and materials. Estimates will be flagged for review if they fall below these thresholds."
      },
      {
        heading: "Sub-Companies",
        body: "If you operate multiple locations, you can create sub-companies (children of your main company). Each operates independently with shared billing."
      },
      {
        heading: "Tips",
        body: "• Changes to company settings (logo, color) instantly update how estimates and invoices appear to customers.\n• Only Admins can access Company Settings.\n• Always verify your email domain to avoid emails landing in spam."
      }
    ]
  },
  {
    id: "email-templates",
    icon: Mail,
    label: "Email Templates",
    color: "bg-sky-100 text-sky-700",
    tag: "Managers & Admins",
    summary: "Customize the visual design of estimate and invoice emails sent to customers.",
    content: [
      {
        heading: "Overview",
        body: "Email Templates control the appearance of the emails sent when you share estimates and invoices with customers. You can customize colors, logo, and footer text."
      },
      {
        heading: "Template Types",
        body: "There are two template types: Estimate and Invoice. Each can have independent styling."
      },
      {
        heading: "Customizing",
        body: "Set your header color, accent color, logo, company name, phone, email, and a custom footer message. A live preview updates as you make changes."
      },
      {
        heading: "Tips",
        body: "• Use your brand's primary color for the header for a professional look.\n• The logo URL should be a publicly accessible image link.\n• If no template is set, a default template using your company's primary color is used."
      }
    ]
  },
  {
    id: "employees",
    icon: Users,
    label: "Employees",
    color: "bg-lime-100 text-lime-700",
    tag: "Admins Only",
    summary: "Invite staff, assign company access, and manage roles.",
    content: [
      {
        heading: "Overview",
        body: "The Employees page (accessible via Admin nav) manages who can log into FieldFlow Pro and which companies they can access."
      },
      {
        heading: "Inviting an Employee",
        body: "Click 'Invite Employee'. Enter their name, email, select a role (Standard or Manager), and assign them to one or more companies. They'll receive an invitation email to set up their account."
      },
      {
        heading: "Roles",
        body: "Standard: Can access all operational features (jobs, customers, estimates, invoices) for their assigned companies. Manager: Full access including admin-level features like settings and reports."
      },
      {
        heading: "Company Access",
        body: "Each employee can be assigned to one or multiple companies. They'll only see data for their assigned companies — useful for multi-location businesses."
      },
      {
        heading: "Adding to Team",
        body: "Check 'Add to Team' when inviting to simultaneously create a Technician record for the employee. This allows them to be assigned to jobs on the schedule."
      },
      {
        heading: "Editing Employee Profiles",
        body: "Click the edit icon on any employee to update their job title, department, contact info, start date, and emergency contact information."
      },
      {
        heading: "Tips",
        body: "• Removing an employee revokes their access to all companies but doesn't delete historical data.\n• Super Admins are platform-level and cannot be managed from this page.\n• Employees can update their own profile from the User Profile page."
      }
    ]
  },
  {
    id: "customer-portal",
    icon: Globe,
    label: "Customer Portal",
    color: "bg-fuchsia-100 text-fuchsia-700",
    tag: "Customers",
    summary: "A self-service portal where customers can view jobs, approve estimates, pay invoices, and message your team.",
    content: [
      {
        heading: "Overview",
        body: "The Customer Portal is a dedicated web interface for your customers. It's separate from the staff app and accessible at your app's /CustomerPortal URL."
      },
      {
        heading: "Accessing the Portal",
        body: "Customers receive an invite email with a link and login credentials. Once logged in, they see only their own data."
      },
      {
        heading: "Home Tab",
        body: "Shows an overview of open jobs, pending estimates, and outstanding invoices. Quick actions let customers reach out or view recent activity."
      },
      {
        heading: "Jobs Tab",
        body: "Lists all jobs — past and present. Customers can view job details, status updates, and before/after photos shared by your team."
      },
      {
        heading: "Estimates Tab",
        body: "Customers can review and digitally approve or decline estimates. Multi-option estimates let them select their preferred package."
      },
      {
        heading: "Invoices Tab",
        body: "Customers can view all invoices and pay outstanding balances online via Stripe. They can also download PDF copies."
      },
      {
        heading: "Account Tab",
        body: "Customers can update their contact information, service addresses, and notification/communication preferences."
      },
      {
        heading: "Tips",
        body: "• Send portal invites from the Customer Detail page or configure auto-invite in Portal Settings.\n• Customers only see data from companies where they have a customer record.\n• The portal works on mobile — customers can review and pay from their phone."
      }
    ]
  }
];

const tagColors = {
  "All Users": "bg-blue-100 text-blue-700",
  "Managers & Admins": "bg-purple-100 text-purple-700",
  "Admins Only": "bg-red-100 text-red-700",
  "Customers": "bg-green-100 text-green-700",
};

function SectionCard({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">{section.label}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColors[section.tag]}`}>{section.tag}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{section.summary}</p>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="space-y-5">
            {section.content.map((block, i) => (
              <div key={i}>
                <h4 className="font-semibold text-slate-800 mb-1.5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {block.heading}
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-3.5">{block.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Documentation() {
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState(new Set(["dashboard"]));
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "All Users", "Managers & Admins", "Admins Only", "Customers"];

  const filtered = sections.filter(s => {
    const matchesSearch = search === "" || 
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.summary.toLowerCase().includes(search.toLowerCase()) ||
      s.content.some(c => c.heading.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = activeFilter === "All" || s.tag === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleSection = (id) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(filtered.map(s => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link to={createPageUrl("Dashboard")} className="hover:text-slate-700 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 font-medium">Documentation</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">FieldFlow Pro Documentation</h1>
          <p className="text-slate-500 mt-2 text-lg">Complete guide for staff, managers, and customers. Click any section to expand.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documentation..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  activeFilter === f
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{filtered.length} section{filtered.length !== 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Expand All</button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Collapse All</button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {filtered.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer Help */}
        <div className="mt-10 p-6 bg-blue-50 rounded-xl border border-blue-100 text-center">
          <h3 className="font-semibold text-slate-900 mb-1">Need more help?</h3>
          <p className="text-sm text-slate-600 mb-4">Contact our support team or submit a ticket from your account dashboard.</p>
          <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Home className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}