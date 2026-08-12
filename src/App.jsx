import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Schedule from './pages/Schedule';
import Booking from './pages/Booking';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Services from './pages/Services';
import LeadCapture from './pages/LeadCapture';
import Payments from './pages/Payments';
import Notifications from './pages/Notifications';
import CustomerDetail from './pages/CustomerDetail';
import LeadDetail from './pages/LeadDetail';
import UserProfile from './pages/UserProfile';
import EstimateDetail from './pages/EstimateDetail';
import JobDetail from './pages/JobDetail';
import InvoiceDetail from './pages/InvoiceDetail';
import Marketing from './pages/Marketing';
import Messages from './pages/Messages';
import CampaignIdeaPreview from './pages/CampaignIdeaPreview';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Henry from './pages/Henry';
import LeadPipeline from './pages/LeadPipeline';
import CompanySettings from './pages/CompanySettings';
import SaaSAdminDashboard from './pages/SaaSAdminDashboard';
import EmailTemplateEditor from './pages/EmailTemplateEditor';
import AIEstimator from './pages/AIEstimator';
import ReleaseNotes from './pages/ReleaseNotes';
import PriceBook from './pages/PriceBook';
import Expenses from './pages/Expenses';
import ProfitMargin from './pages/ProfitMargin';
import NewJob from './pages/NewJob';
import NewEstimate from './pages/NewEstimate';
import NewInvoice from './pages/NewInvoice';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CustomerPortal from './pages/CustomerPortal';
import Documentation from './pages/Documentation';
import Articles from './pages/Articles';
import ArticleDetail from './pages/ArticleDetail';
import AdminArticles from './pages/AdminArticles';
import AuditLog from './pages/AuditLog';
import Tasks from './pages/Tasks';
import Support from './pages/Support';
import Marketplace from './pages/Marketplace';
import Inventory from './pages/Inventory';
import ReceiptScanner from './pages/ReceiptScanner';
import AccountingAudit from './pages/AccountingAudit';
import AccountingAdmin from './pages/AccountingAdmin';
import Dispatch from './pages/Dispatch';
import WorkLogs from './pages/WorkLogs';
import FieldTechAgent from './pages/FieldTechAgent';
import SowSign from './pages/SowSign';
import MessageQueue from './pages/MessageQueue';
import JobTemplates from './pages/JobTemplates';
import TimeClock from './pages/TimeClock';
import TimeClockMap from './pages/TimeClockMap';
import Companies from './pages/Companies';
import AdminCompanies from './pages/AdminCompanies';
import SaaSUsers from './pages/SaaSUsers';
import Users from './pages/Users';
import Reports from './pages/Reports';
import ProductOverview from './pages/ProductOverview';
import PaymentConfirmation from './pages/PaymentConfirmation';
import PrivacyPolicyPublic from './pages/PrivacyPolicyPublic';
import TermsAndConditions from './pages/TermsAndConditions';
import AdminConsoleLayout from './components/AdminConsoleLayout';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Only redirect to login for protected routes
      const publicPaths = ['/', '/Landing', '/Register', '/Booking', '/LeadCapture'];
      const isPublicPath = publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith(p + '/'));
      if (!isPublicPath) {
        navigateToLogin();
      }
      // Always show a redirect message instead of blank screen
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm">Redirecting to login...</p>
        </div>
      );
    } else {
      // Unknown auth error — show a safe fallback instead of blank screen
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 gap-4">
          <p className="text-slate-600 text-sm">Something went wrong loading the app.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Henry" element={<LayoutWrapper currentPageName="Henry"><Henry /></LayoutWrapper>} />
      <Route path="/Schedule" element={<LayoutWrapper currentPageName="Schedule"><Schedule /></LayoutWrapper>} />
      <Route path="/Booking" element={<Booking />} />
      <Route path="/SuperAdminDashboard" element={<LayoutWrapper currentPageName="SuperAdminDashboard"><SuperAdminDashboard /></LayoutWrapper>} />
      <Route path="/Services" element={<LayoutWrapper currentPageName="Services"><Services /></LayoutWrapper>} />
      <Route path="/LeadCapture" element={<LeadCapture />} />
      <Route path="/Payments" element={<LayoutWrapper currentPageName="Payments"><Payments /></LayoutWrapper>} />
      <Route path="/Notifications" element={<LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper>} />
      <Route path="/CustomerDetail/:id" element={<LayoutWrapper currentPageName="Customers"><CustomerDetail /></LayoutWrapper>} />
      <Route path="/LeadDetail/:id" element={<LayoutWrapper currentPageName="Leads"><LeadDetail /></LayoutWrapper>} />
      <Route path="/LeadPipeline" element={<LayoutWrapper currentPageName="Leads"><LeadPipeline /></LayoutWrapper>} />
      <Route path="/UserProfile/:id" element={<LayoutWrapper currentPageName="Users"><UserProfile /></LayoutWrapper>} />
      <Route path="/EstimateDetail/:id" element={<LayoutWrapper currentPageName="Estimates"><EstimateDetail /></LayoutWrapper>} />
      <Route path="/JobDetail/:id" element={<LayoutWrapper currentPageName="Jobs"><JobDetail /></LayoutWrapper>} />
      <Route path="/InvoiceDetail/:id" element={<LayoutWrapper currentPageName="Invoices"><InvoiceDetail /></LayoutWrapper>} />
      <Route path="/Marketing" element={<LayoutWrapper currentPageName="Marketing"><Marketing /></LayoutWrapper>} />
      <Route path="/Messages" element={<LayoutWrapper currentPageName="Messages"><Messages /></LayoutWrapper>} />
      <Route path="/CompanySettings" element={<LayoutWrapper currentPageName="CompanySettings"><CompanySettings /></LayoutWrapper>} />
      <Route path="/SaaSAdminDashboard" element={<LayoutWrapper currentPageName="SaaSAdminDashboard"><SaaSAdminDashboard /></LayoutWrapper>} />
      <Route path="/CampaignIdeaPreview" element={<CampaignIdeaPreview />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/EmailTemplateEditor" element={<LayoutWrapper currentPageName="EmailTemplateEditor"><EmailTemplateEditor /></LayoutWrapper>} />
      <Route path="/AIEstimator" element={<LayoutWrapper currentPageName="Estimates"><AIEstimator /></LayoutWrapper>} />
      <Route path="/ReleaseNotes" element={<LayoutWrapper currentPageName="ReleaseNotes"><ReleaseNotes /></LayoutWrapper>} />
      <Route path="/PriceBook" element={<LayoutWrapper currentPageName="PriceBook"><PriceBook /></LayoutWrapper>} />
      <Route path="/NewJob" element={<LayoutWrapper currentPageName="Jobs"><NewJob /></LayoutWrapper>} />
      <Route path="/NewEstimate" element={<LayoutWrapper currentPageName="Estimates"><NewEstimate /></LayoutWrapper>} />
      <Route path="/NewInvoice" element={<LayoutWrapper currentPageName="Invoices"><NewInvoice /></LayoutWrapper>} />
      <Route path="/TermsOfService" element={<TermsOfService />} />
      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/Expenses" element={<LayoutWrapper currentPageName="Expenses"><Expenses /></LayoutWrapper>} />
      <Route path="/ProfitMargin" element={<LayoutWrapper currentPageName="ProfitMargin"><ProfitMargin /></LayoutWrapper>} />
      <Route path="/Documentation" element={<LayoutWrapper currentPageName="Documentation"><Documentation /></LayoutWrapper>} />
      <Route path="/AuditLog" element={<LayoutWrapper currentPageName="AuditLog"><AuditLog /></LayoutWrapper>} />
      <Route path="/Tasks" element={<LayoutWrapper currentPageName="Tasks"><Tasks /></LayoutWrapper>} />
      <Route path="/Support" element={<LayoutWrapper currentPageName="Support"><Support /></LayoutWrapper>} />
      <Route path="/Marketplace" element={<LayoutWrapper currentPageName="Marketplace"><Marketplace /></LayoutWrapper>} />
      <Route path="/Inventory" element={<LayoutWrapper currentPageName="Inventory"><Inventory /></LayoutWrapper>} />
      <Route path="/ReceiptScanner" element={<LayoutWrapper currentPageName="ReceiptScanner"><ReceiptScanner /></LayoutWrapper>} />
      <Route path="/Team" element={<LayoutWrapper currentPageName="CompanySettings"><CompanySettings /></LayoutWrapper>} />
      <Route path="/AccountingAudit" element={<LayoutWrapper currentPageName="AccountingAudit"><AccountingAudit /></LayoutWrapper>} />
      <Route path="/Dispatch" element={<LayoutWrapper currentPageName="Dispatch"><Dispatch /></LayoutWrapper>} />
      <Route path="/WorkLogs" element={<LayoutWrapper currentPageName="WorkLogs"><WorkLogs /></LayoutWrapper>} />
      <Route path="/FieldTechAgent" element={<LayoutWrapper currentPageName="FieldTechAgent"><FieldTechAgent /></LayoutWrapper>} />
      <Route path="/MessageQueue" element={<LayoutWrapper currentPageName="MessageQueue"><MessageQueue /></LayoutWrapper>} />
      <Route path="/JobTemplates" element={<LayoutWrapper currentPageName="JobTemplates"><JobTemplates /></LayoutWrapper>} />
      <Route path="/TimeClock" element={<LayoutWrapper currentPageName="TimeClock"><TimeClock /></LayoutWrapper>} />
      <Route path="/TimeClockMap" element={<LayoutWrapper currentPageName="TimeClockMap"><TimeClockMap /></LayoutWrapper>} />

      {/* Admin Console routes */}
      <Route path="/admin/saas-admin" element={<AdminConsoleLayout><SaaSAdminDashboard /></AdminConsoleLayout>} />
      <Route path="/admin/dashboard" element={<AdminConsoleLayout><SuperAdminDashboard /></AdminConsoleLayout>} />
      <Route path="/admin/marketing" element={<AdminConsoleLayout><Marketing /></AdminConsoleLayout>} />
      <Route path="/admin/accounting" element={<AdminConsoleLayout><AccountingAdmin /></AdminConsoleLayout>} />
      <Route path="/admin/companies" element={<AdminConsoleLayout><AdminCompanies /></AdminConsoleLayout>} />
      <Route path="/admin/employees" element={<AdminConsoleLayout><Users /></AdminConsoleLayout>} />
      <Route path="/admin/users" element={<AdminConsoleLayout><SaaSUsers /></AdminConsoleLayout>} />
      <Route path="/admin/reports" element={<AdminConsoleLayout><Reports /></AdminConsoleLayout>} />
      <Route path="/admin/audit-log" element={<AdminConsoleLayout><AuditLog /></AdminConsoleLayout>} />
      <Route path="/admin/articles" element={<AdminConsoleLayout><AdminArticles /></AdminConsoleLayout>} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/Landing" element={<Landing />} />
            <Route path="/Register" element={<Register />} />
            <Route path="/Booking" element={<Booking />} />
            <Route path="/LeadCapture" element={<LeadCapture />} />
            <Route path="/TermsOfService" element={<TermsOfService />} />
            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
            <Route path="/CustomerPortal" element={<CustomerPortal />} />
            <Route path="/SowSign/:jobId/:revisionId" element={<SowSign />} />
            <Route path="/ProductOverview" element={<ProductOverview />} />
            <Route path="/PaymentConfirmation" element={<PaymentConfirmation />} />
            <Route path="/privacy" element={<PrivacyPolicyPublic />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/Articles" element={<Articles />} />
            <Route path="/ArticleDetail/:id" element={<ArticleDetail />} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App