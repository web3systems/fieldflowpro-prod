import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/Layout";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { FileText, Plus, Mail, CheckCircle, XCircle, PenLine, X, Save, Clock } from "lucide-react";
import { format } from "date-fns";

const REV_STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default function JobScopeOfWorkSection({ job, form, setForm, onSave }) {
  const { user } = useApp();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [sendingId, setSendingId] = useState(null);
  const [savingRevision, setSavingRevision] = useState(false);

  const revisions = form.scope_of_work_revisions || [];

  async function handleAddRevision() {
    if (!newContent.trim() || newContent === "<p><br></p>") {
      toast({ title: "Please enter some content for the statement of work", variant: "destructive" });
      return;
    }
    setSavingRevision(true);
    try {
      const revision = {
        id: `rev_${Date.now()}`,
        title: newTitle.trim() || `Change Order ${revisions.length + 1}`,
        content: newContent,
        created_at: new Date().toISOString(),
        created_by: user?.id || "",
        created_by_name: user?.full_name || user?.email || "",
        status: "draft",
      };
      const updatedRevisions = [...revisions, revision];
      await base44.entities.Job.update(job.id, { scope_of_work_revisions: updatedRevisions });
      setForm(f => ({ ...f, scope_of_work_revisions: updatedRevisions }));
      setNewTitle("");
      setNewContent("");
      setAdding(false);
      toast({ title: "Statement of Work added" });
    } catch (e) {
      toast({ title: "Failed to save: " + e.message, variant: "destructive" });
    } finally {
      setSavingRevision(false);
    }
  }

  async function handleSendForSignature(revId) {
    setSendingId(revId);
    try {
      const res = await base44.functions.invoke("sendSowForSignature", {
        job_id: job.id,
        revision_id: revId,
        company_id: form.company_id,
      });
      if (res.data?.error) throw new Error(res.data.error);
      // Refresh revisions from response (status updated server-side)
      const jobs = await base44.entities.Job.filter({ id: job.id });
      if (jobs[0]) {
        setForm(f => ({ ...f, scope_of_work_revisions: jobs[0].scope_of_work_revisions || [] }));
      }
      toast({ title: `Sent to ${res.data?.sent_to || "customer"} for signature` });
    } catch (e) {
      toast({ title: "Failed to send: " + e.message, variant: "destructive" });
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Original SOW from estimate */}
      {form.scope_of_work && form.scope_of_work.trim() && form.scope_of_work !== "<p><br></p>" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Original Statement of Work
              <span className="text-xs font-normal text-slate-400 ml-1">— from approved estimate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rich-text max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: form.scope_of_work }}
            />
          </CardContent>
        </Card>
      )}

      {/* Revisions / Change Orders */}
      {revisions.length > 0 && (
        <div className="space-y-3">
          {revisions.map((rev, idx) => (
            <Card key={rev.id} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-slate-400" />
                    {rev.title || `Change Order ${idx + 1}`}
                  </CardTitle>
                  <Badge className={`text-xs ${REV_STATUS_STYLES[rev.status] || REV_STATUS_STYLES.draft}`}>
                    {rev.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">
                  Added {rev.created_at ? format(new Date(rev.created_at), "MMM d, yyyy 'at' h:mm a") : ""} by {rev.created_by_name || "—"}
                  {rev.sent_at && ` · sent ${format(new Date(rev.sent_at), "MMM d, yyyy")}`}
                  {rev.signed_at && ` · ${rev.status === "signed" ? "signed" : "declined"} ${format(new Date(rev.signed_at), "MMM d, yyyy")} by ${rev.signed_by_name || "customer"}`}
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className="rich-text max-w-none text-slate-700 mb-3"
                  dangerouslySetInnerHTML={{ __html: rev.content }}
                />
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {rev.status === "draft" && (
                    <Button
                      size="sm"
                      className="gap-1 text-xs bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleSendForSignature(rev.id)}
                      disabled={sendingId === rev.id}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {sendingId === rev.id ? "Sending..." : "Email for E-Signature"}
                    </Button>
                  )}
                  {rev.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => handleSendForSignature(rev.id)}
                      disabled={sendingId === rev.id}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {sendingId === rev.id ? "Resending..." : "Resend"}
                    </Button>
                  )}
                  {rev.status === "signed" && (
                    <div className="flex items-center gap-1.5 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" /> Signed by {rev.signed_by_name || "customer"}
                    </div>
                  )}
                  {rev.status === "declined" && (
                    <div className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle className="w-4 h-4" /> Declined by {rev.signed_by_name || "customer"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new SOW form */}
      {adding ? (
        <Card className="border-0 shadow-sm border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              New Statement of Work / Change Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Title</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Additional bathroom demo, Change Order #2..."
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Content</Label>
              <ReactQuill
                theme="snow"
                value={newContent}
                onChange={setNewContent}
                placeholder="Describe the additional or changed scope: what's being added/changed, materials, labor, terms..."
                style={{ minHeight: 140 }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}>
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={handleAddRevision} disabled={savingRevision}>
                <Save className="w-3.5 h-3.5" /> {savingRevision ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center">
          <Button variant="outline" className="gap-2" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Add Statement of Work
          </Button>
        </div>
      )}
    </div>
  );
}