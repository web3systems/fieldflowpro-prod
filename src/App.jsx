import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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
import EstimatorConfig from './pages/EstimatorConfig';
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
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AuthProvider } from '@/lib/AuthContext';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PUBLIC_PAGE_KEYS = new Set(['Booking', 'CustomerPortal', 'LeadCapture']);

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Auth routes — public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/Register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public routes — no auth required */}
            <Route path="/" element={<Landing />} />
            <Route path="/Landing" element={<Landing />} />
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

            {/* Protected app routes — auth required */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              {Object.entries(Pages).filter(([key]) => !PUBLIC_PAGE_KEYS.has(key)).map(([path, Page]) => (
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
              <Route path="/SuperAdminDashboard" element={<LayoutWrapper currentPageName="SuperAdminDashboard"><SuperAdminDashboard /></LayoutWrapper>} />
              <Route path="/Services" element={<LayoutWrapper currentPageName="Services"><Services /></LayoutWrapper>} />
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
              <Route path="/EmailTemplateEditor" element={<LayoutWrapper currentPageName="EmailTemplateEditor"><EmailTemplateEditor /></LayoutWrapper>} />
              <Route path="/AIEstimator" element={<LayoutWrapper currentPageName="Estimates"><AIEstimator /></LayoutWrapper>} />
              <Route path="/ReleaseNotes" element={<LayoutWrapper currentPageName="ReleaseNotes"><ReleaseNotes /></LayoutWrapper>} />
              <Route path="/PriceBook" element={<LayoutWrapper currentPageName="PriceBook"><PriceBook /></LayoutWrapper>} />
              <Route path="/NewJob" element={<LayoutWrapper currentPageName="Jobs"><NewJob /></LayoutWrapper>} />
              <Route path="/NewEstimate" element={<LayoutWrapper currentPageName="Estimates"><NewEstimate /></LayoutWrapper>} />
              <Route path="/NewInvoice" element={<LayoutWrapper currentPageName="Invoices"><NewInvoice /></LayoutWrapper>} />
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
              <Route path="/admin/estimator-config" element={<AdminConsoleLayout><EstimatorConfig /></AdminConsoleLayout>} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App