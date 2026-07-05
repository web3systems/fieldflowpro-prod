import { useState, useEffect, useContext } from "react";
import { base44 } from "@/api/base44Client";
import { AppContext } from "../Layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Trash2, FileText, DollarSign, Briefcase, RefreshCw, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function AuditLog() {
  const appCtx = useContext(AppContext);
  const isAdminMode = !appCtx?.activeCompany;

  const [allCompanies, setAllCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const activeCompany = isAdminMode
    ? allCompanies.find(c => c.id === selectedCompanyId) || null
    : appCtx?.activeCompany;

  const [deletionLogs, setDeletionLogs] = useState([]);
  const [orphanedJobs, setOrphanedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  // Admin mode: load all master companies for picker
  useEffect(() => {
    if (!isAdminMode) return;
    base44.entities.Company.filter({ is_active: true }, "name", 200)
      .then(list => {
        const masters = list.filter(c => !c.parent_company_id);
        setAllCompanies(masters);
        if (masters.length > 0) setSelectedCompanyId(masters[0].id);
      })
      .catch(() => {});
  }, [isAdminMode]);

  useEffect(() => {
    if (activeCompany?.id) load();
  }, [activeCompany?.id]);

  async function load() {
    if (!activeCompany?.id) return;
    setLoading(true);
    const [logs, jobs, estimates, invoices] = await Promise.all([
      base44.entities.AuditLog.filter({ company_id: activeCompany.id, action: "delete" }, "-created_date", 200),
      base44.entities.Job.filter({ company_id: activeCompany.id }),
      base44.entities.Estimate.filter({ company_id: activeCompany.id }),
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
    ]);

    setDeletionLogs(logs);

    const estimateIds = new Set(estimates.map(e => e.id));
    const invoiceIds = new Set(invoices.map(i => i.id));

    const orphans = jobs.filter(job => {
      const missingEstimate = job.estimate_id && !estimateIds.has(job.estimate_id);
      const missingInvoice = job.invoice_id && !invoiceIds.has(job.invoice_id);
      const neverLinked = !job.estimate_id && !job.invoice_id;
      return missingEstimate || missingInvoice || neverLinked;
    }).map(job => ({
      ...job,
      missingEstimate: job.estimate_id && !estimateIds.has(job.estimate_id),
      missingInvoice: job.invoice_id && !invoiceIds.has(job.invoice_id),
      neverLinked: !job.estimate_id && !job.invoice_id,
    }));

    setOrphanedJobs(orphans);
    setLoading(false);
  }

  const deletedEstimates = deletionLogs.filter(l => l.entity_type === "Estimate");
  const deletedInvoices = deletionLogs.filter(l => l.entity_type === "Invoice");
  const suspiciousJobs = orphanedJobs.filter(j => j.missingEstimate || j.missingInvoice);

  // Show company picker loading state in admin mode
  if (isAdminMode && allCompanies.length === 0) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Audit Log & Integrity Check
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeCompany ? `${activeCompany.name} — ` : ""}Track deletions and surface jobs with missing financial records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminMode && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <Select value={selectedCompanyId || ""} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-56 h-9 text-sm">
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {allCompanies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={!activeCompany} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {!activeCompany ? (
        <div className="text-center py-16 text-slate-400">Select a company to view its audit log.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-red-100">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-red-600">{suspiciousJobs.length}</div>
                <div className="text-xs text-slate-500 mt-1">Jobs w/ Missing Records</div>
              </CardContent>
            </Card>
            <Card className="border-amber-100">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-amber-600">{deletedInvoices.length}</div>
                <div className="text-xs text-slate-500 mt-1">Deleted Invoices (logged)</div>
              </CardContent>
            </Card>
            <Card className="border-amber-100">
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-amber-600">{deletedEstimates.length}</div>
                <div className="text-xs text-slate-500 mt-1">Deleted Estimates (logged)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-2xl font-bold text-slate-700">{orphanedJobs.filter(j => j.neverLinked).length}</div>
                <div className="text-xs text-slate-500 mt-1">Jobs Never Linked</div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : (
            <Tabs defaultValue="suspicious">
              <TabsList>
                <TabsTrigger value="suspicious">🚨 Suspicious Jobs ({suspiciousJobs.length})</TabsTrigger>
                <TabsTrigger value="deletions">🗑️ Deletion Log ({deletionLogs.length})</TabsTrigger>
                <TabsTrigger value="unlinked">🔗 Never Linked ({orphanedJobs.filter(j => j.neverLinked).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="suspicious">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Jobs referencing deleted estimates or invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {suspiciousJobs.length === 0 ? (
                      <p className="text-slate-400 text-sm">No suspicious jobs found.</p>
                    ) : (
                      <div className="space-y-3">
                        {suspiciousJobs.map(job => (
                          <div key={job.id} className="border border-red-100 rounded-lg p-4 bg-red-50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-800">{job.title}</p>
                                <p className="text-xs text-slate-500">
                                  Job ID: {job.id} · Status: {job.status} · Created: {job.created_date ? format(new Date(job.created_date), "MMM d, yyyy") : "—"}
                                </p>
                                <p className="text-xs text-slate-500">Amount: ${(job.total_amount || 0).toFixed(2)}</p>
                              </div>
                              <div className="flex flex-col gap-1 items-end">
                                {job.missingEstimate && (
                                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                                    <FileText className="w-3 h-3 mr-1" /> Estimate Deleted
                                  </Badge>
                                )}
                                {job.missingInvoice && (
                                  <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">
                                    <DollarSign className="w-3 h-3 mr-1" /> Invoice Deleted
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {(() => {
                              const relatedDeletes = deletionLogs.filter(l =>
                                (l.entity_type === "Estimate" && l.entity_id === job.estimate_id) ||
                                (l.entity_type === "Invoice" && l.entity_id === job.invoice_id)
                              );
                              if (relatedDeletes.length === 0) return (
                                <p className="text-xs text-amber-700 mt-2 italic">⚠️ Deletion was not logged (occurred before audit logging was enabled).</p>
                              );
                              return relatedDeletes.map(dl => (
                                <div key={dl.id} className="mt-2 text-xs text-slate-600 bg-white rounded p-2 border border-red-100">
                                  <strong>{dl.entity_type}</strong> deleted on {dl.created_date ? format(new Date(dl.created_date), "MMM d, yyyy h:mm a") : "unknown date"}
                                  {dl.performed_by_name && <span> by <strong>{dl.performed_by_name}</strong></span>}
                                  {dl.entity_snapshot?.total && <span> · Amount: ${dl.entity_snapshot.total}</span>}
                                </div>
                              ));
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deletions">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-500" />
                      All Logged Deletions
                    </CardTitle>
                    <p className="text-xs text-slate-400">Only captures deletions that occurred after audit logging was enabled.</p>
                  </CardHeader>
                  <CardContent>
                    {deletionLogs.length === 0 ? (
                      <p className="text-slate-400 text-sm">No deletions logged yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {deletionLogs.map(log => (
                          <div key={log.id} className="border rounded-lg p-3 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={
                                  log.entity_type === "Invoice" ? "border-red-300 text-red-700" :
                                  log.entity_type === "Estimate" ? "border-amber-300 text-amber-700" :
                                  "border-slate-300 text-slate-700"
                                }>
                                  {log.entity_type}
                                </Badge>
                                <span className="text-sm text-slate-700">{log.entity_snapshot?.title || log.entity_snapshot?.invoice_number || log.entity_id}</span>
                                {log.entity_snapshot?.total && (
                                  <span className="text-sm font-medium text-slate-900">${Number(log.entity_snapshot.total).toFixed(2)}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">{log.created_date ? format(new Date(log.created_date), "MMM d, yyyy h:mm a") : "—"}</p>
                                {log.performed_by_name && <p className="text-xs font-medium text-slate-700">{log.performed_by_name}</p>}
                              </div>
                            </div>
                            {expandedLog === log.id && log.entity_snapshot && (
                              <pre className="mt-3 text-xs bg-slate-100 rounded p-3 overflow-auto max-h-48 text-slate-700">
                                {JSON.stringify(log.entity_snapshot, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="unlinked">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      Jobs with no estimate or invoice ever linked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orphanedJobs.filter(j => j.neverLinked).length === 0 ? (
                      <p className="text-slate-400 text-sm">All jobs have linked financial records.</p>
                    ) : (
                      <div className="space-y-2">
                        {orphanedJobs.filter(j => j.neverLinked).map(job => (
                          <div key={job.id} className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800">{job.title}</p>
                              <p className="text-xs text-slate-500">
                                Status: {job.status} · Amount: ${(job.total_amount || 0).toFixed(2)} · Created: {job.created_date ? format(new Date(job.created_date), "MMM d, yyyy") : "—"}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">No Records</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}