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
import Register from './pages/Register';
import Landing from './pages/Landing';
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
        return null;
      }
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
      <Route path="/Schedule" element={<LayoutWrapper currentPageName="Schedule"><Schedule /></LayoutWrapper>} />
      <Route path="/Booking" element={<Booking />} />
      <Route path="/SuperAdminDashboard" element={<LayoutWrapper currentPageName="SuperAdminDashboard"><SuperAdminDashboard /></LayoutWrapper>} />
      <Route path="/Services" element={<LayoutWrapper currentPageName="Services"><Services /></LayoutWrapper>} />
      <Route path="/LeadCapture" element={<LeadCapture />} />
      <Route path="/Payments" element={<LayoutWrapper currentPageName="Payments"><Payments /></LayoutWrapper>} />
      <Route path="/Notifications" element={<LayoutWrapper currentPageName="Notifications"><Notifications /></LayoutWrapper>} />
      <Route path="/CustomerDetail/:id" element={<LayoutWrapper currentPageName="Customers"><CustomerDetail /></LayoutWrapper>} />
      <Route path="/LeadDetail/:id" element={<LayoutWrapper currentPageName="Leads"><LeadDetail /></LayoutWrapper>} />
      <Route path="/UserProfile/:id" element={<LayoutWrapper currentPageName="Users"><UserProfile /></LayoutWrapper>} />
      <Route path="/EstimateDetail/:id" element={<LayoutWrapper currentPageName="Estimates"><EstimateDetail /></LayoutWrapper>} />
      <Route path="/JobDetail/:id" element={<LayoutWrapper currentPageName="Jobs"><JobDetail /></LayoutWrapper>} />
      <Route path="/InvoiceDetail/:id" element={<LayoutWrapper currentPageName="Invoices"><InvoiceDetail /></LayoutWrapper>} />
      <Route path="/Marketing" element={<LayoutWrapper currentPageName="Marketing"><Marketing /></LayoutWrapper>} />
      <Route path="/Register" element={<Register />} />
      <Route path="/Landing" element={<Landing />} />
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
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App