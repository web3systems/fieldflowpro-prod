import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalHome from "@/components/portal/PortalHome";
import PortalJobs from "@/components/portal/PortalJobs";
import PortalEstimates from "@/components/portal/PortalEstimates";
import PortalInvoices from "@/components/portal/PortalInvoices";
import PortalAccount from "@/components/portal/PortalAccount";
import PortalSupport from "@/components/portal/PortalSupport";

export default function CustomerPortal() {
  const previewCustomerId = new URLSearchParams(window.location.search).get("preview_customer_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isPreview, setIsPreview] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [services, setServices] = useState([]);
  const [accountDataLoading, setAccountDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment_success") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab("invoices");
    } else if (params.has("estimate_id")) {
      setActiveTab("estimates");
    } else if (params.has("invoice_id")) {
      setActiveTab("invoices");
    }
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      loadAccountData(accounts[activeIndex].customer.id);
    }
  }, [activeIndex, accounts]);

  async function init() {
    try {
      const res = await base44.functions.invoke("getCustomerPortalData", {
        action: "init",
        ...(previewCustomerId ? { preview_customer_id: previewCustomerId } : {}),
      });
      const data = res.data;

      if (data.is_preview) setIsPreview(true);

      if (data.is_staff && !previewCustomerId) {
        window.location.href = "/Dashboard";
        return;
      }

      if (!data.customers || data.customers.length === 0) {
        setError("no_account");
        setLoading(false);
        return;
      }

      const companyMap = Object.fromEntries((data.companies || []).map(c => [c.id, c]));
      const accts = data.customers.map(c => ({ customer: c, company: companyMap[c.company_id] || null }));
      setAccounts(accts);
    } catch {
      base44.auth.redirectToLogin(window.location.href);
    }
    setLoading(false);
  }

  async function loadAccountData(customerId) {
    setAccountDataLoading(true);
    try {
      const res = await base44.functions.invoke("getCustomerPortalData", {
        action: "load_account",
        payload: { customer_id: customerId },
        ...(previewCustomerId ? { preview_customer_id: previewCustomerId } : {}),
      });
      const d = res.data;
      setJobs(d.jobs || []);
      setInvoices(d.invoices || []);
      setEstimates(d.estimates || []);
      setServices(d.services || []);
    } catch (e) {
      console.error("Failed to load account data", e);
    }
    setAccountDataLoading(false);
  }

  async function handleEstimateDecision(estimate, decision) {
    await base44.functions.invoke("getCustomerPortalData", {
      action: "approve_estimate",
      payload: { estimate_id: estimate.id, decision },
    });
    await loadAccountData(activeAccount.customer.id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "no_account") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">We couldn't find a customer account linked to your email.</p>
          <Button onClick={() => base44.auth.logout()} variant="outline" className="w-full">Sign Out</Button>
        </div>
      </div>
    );
  }

  const activeAccount = accounts[activeIndex] || null;
  const customer = activeAccount?.customer || null;
  const company = activeAccount?.company || null;

  if (!customer) return null;

  const tabContent = accountDataLoading ? (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    <>
      {activeTab === "home" && (
        <PortalHome
          customer={customer}
          company={company}
          jobs={jobs}
          invoices={invoices}
          estimates={estimates}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === "jobs" && <PortalJobs jobs={jobs} company={company} />}
      {activeTab === "estimates" && (
        <PortalEstimates estimates={estimates} company={company} onDecision={handleEstimateDecision} />
      )}
      {activeTab === "invoices" && <PortalInvoices invoices={invoices} company={company} />}
      {activeTab === "account" && (
        <PortalAccount customer={customer} company={company} services={services} />
      )}
      {activeTab === "support" && (
        <PortalSupport customer={customer} company={company} />
      )}
    </>
  );

  return (
    <div>
      {isPreview && (
        <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between gap-4 sticky top-0 z-50">
          <span>👁 <strong>Staff Preview Mode</strong> — You're viewing the portal as <strong>{customer.first_name} {customer.last_name}</strong>. Changes are real.</span>
          <button onClick={() => window.close()} className="text-white underline text-xs hover:opacity-80">Close</button>
        </div>
      )}
      <PortalLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        customer={customer}
        company={company}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      >
        {tabContent}
      </PortalLayout>
    </div>
  );
}