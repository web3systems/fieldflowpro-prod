import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, FileText, PenLine, ShieldCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function SowSign() {
  const { jobId, revisionId } = useParams();
  const [job, setJob] = useState(null);
  const [revision, setRevision] = useState(null);
  const [company, setCompany] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // null | 'signed' | 'declined'

  useEffect(() => {
    (async () => {
      try {
        const jobs = await base44.entities.Job.filter({ id: jobId });
        const j = jobs[0];
        if (!j) { setError("Document not found."); setLoading(false); return; }
        setJob(j);
        const rev = (j.scope_of_work_revisions || []).find(r => r.id === revisionId);
        if (!rev) { setError("This statement of work could not be found."); setLoading(false); return; }
        setRevision(rev);
        if (rev.status === "signed" || rev.status === "declined") setDone(rev.status);

        const [companies, customers] = await Promise.all([
          base44.entities.Company.filter({ id: j.company_id }),
          base44.entities.Customer.filter({ id: j.customer_id }),
        ]);
        setCompany(companies[0] || null);
        setCustomer(customers[0] || null);
        if (customers[0]?.first_name) setName(`${customers[0].first_name} ${customers[0].last_name || ""}`.trim());
      } catch (e) {
        setError("Failed to load document.");
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, revisionId]);

  async function handleSubmit(action) {
    if (!name.trim()) { alert("Please enter your full name to sign."); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("signSow", {
        job_id: jobId,
        revision_id: revisionId,
        signed_by_name: name,
        action,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setDone(action === "decline" ? "declined" : "signed");
      setRevision(r => ({ ...r, status: action === "decline" ? "declined" : "signed", signed_by_name: name, signed_at: new Date().toISOString() }));
    } catch (e) {
      alert(e.message || "Failed to submit signature.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6 text-center">
      <XCircle className="w-12 h-12 text-red-400" />
      <p className="text-slate-600">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-12 mx-auto mb-3 object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-white mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">{company?.name || "Statement of Work"}</h1>
          <p className="text-slate-500 text-sm mt-1">E-Signature Request</p>
        </div>

        {/* Job info */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Project</span>
              <span className="font-medium text-slate-800">{job?.title}</span>
            </div>
            {customer && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium text-slate-800">{customer.business_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()}</span>
              </div>
            )}
            {revision?.created_at && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Issued</span>
                <span className="font-medium text-slate-800">{format(new Date(revision.created_at), "MMM d, yyyy")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Already signed/declined banner */}
        {done && (
          <div className={`rounded-xl p-4 flex items-center gap-3 ${done === "signed" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            {done === "signed" ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
            <div>
              <p className={`font-semibold ${done === "signed" ? "text-green-800" : "text-red-800"}`}>
                {done === "signed" ? "Document Signed" : "Document Declined"}
              </p>
              <p className={`text-sm ${done === "signed" ? "text-green-700" : "text-red-700"}`}>
                {done === "signed"
                  ? `Signed by ${revision?.signed_by_name || "customer"} on ${revision?.signed_at ? format(new Date(revision.signed_at), "MMM d, yyyy 'at' h:mm a") : ""}.`
                  : `Declined by ${revision?.signed_by_name || "customer"}.`}
              </p>
            </div>
          </div>
        )}

        {/* SOW content */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <PenLine className="w-5 h-5 text-slate-400" />
              {revision?.title || "Statement of Work"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div
              className="rich-text max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: revision?.content || "" }}
            />
          </CardContent>
        </Card>

        {/* Original SOW (context) */}
        {job?.scope_of_work && job.scope_of_work.trim() && job.scope_of_work !== "<p><br></p>" && (
          <Card className="border-0 shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-500">
                <FileText className="w-4 h-4" /> Original Statement of Work (for reference)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="rich-text max-w-none text-slate-600"
                dangerouslySetInnerHTML={{ __html: job.scope_of_work }}
              />
            </CardContent>
          </Card>
        )}

        {/* Sign panel */}
        {!done && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <p className="font-semibold">Review &amp; Sign</p>
              </div>
              <p className="text-sm text-slate-500">
                By signing below, you acknowledge and agree to the updated scope of work described above.
              </p>
              <div>
                <Label className="text-sm mb-1.5 block">Full Name (Signature)</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Type your full legal name"
                  className="text-base"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmit("sign")}
                  disabled={submitting}
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? "Submitting..." : "I Agree — Sign Document"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleSubmit("decline")}
                  disabled={submitting}
                >
                  <XCircle className="w-4 h-4" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-slate-400 pt-2">
          Powered by FieldFlow Pro · Secure Electronic Signature
        </p>
      </div>
    </div>
  );
}