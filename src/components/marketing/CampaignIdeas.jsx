import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ExternalLink, Lock, Lightbulb } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  idea: "bg-yellow-100 text-yellow-700",
  in_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-500",
};

const STATUS_LABELS = {
  idea: "Idea",
  in_review: "In Review",
  approved: "Approved",
  archived: "Archived",
};

const emptyForm = { name: "", description: "", status: "idea", html_content: "", is_confidential: true };

export default function CampaignIdeas({ activeCompany }) {
  const { toast } = useToast();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { if (activeCompany) load(); }, [activeCompany]);

  async function load() {
    setLoading(true);
    const data = await base44.entities.CampaignIdea.filter({ company_id: activeCompany.id }, "-created_date");
    setIdeas(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setSheetOpen(true);
  }

  function openEdit(idea) {
    setEditing(idea);
    setForm({
      name: idea.name || "",
      description: idea.description || "",
      status: idea.status || "idea",
      html_content: "",
      is_confidential: idea.is_confidential ?? true,
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);

    let html_content_url = editing?.html_content_url || "";

    // If there's HTML content, upload it as a file
    if (form.html_content.trim()) {
      const blob = new Blob([form.html_content], { type: "text/html" });
      const file = new File([blob], "campaign-landing.html", { type: "text/html" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      html_content_url = file_url;
    }

    const data = {
      name: form.name,
      description: form.description,
      status: form.status,
      is_confidential: form.is_confidential,
      html_content_url,
      company_id: activeCompany.id,
    };

    if (editing?.id) {
      await base44.entities.CampaignIdea.update(editing.id, data);
    } else {
      await base44.entities.CampaignIdea.create(data);
    }
    setSaving(false);
    setSheetOpen(false);
    await load();
    toast({ title: editing?.id ? "Idea updated" : "Idea saved" });
  }

  async function handleDelete() {
    await base44.entities.CampaignIdea.delete(deleteTarget.id);
    setDeleteTarget(null);
    await load();
    toast({ title: "Idea deleted" });
  }

  function openPreview(idea) {
    window.open(`/CampaignIdeaPreview?id=${idea.id}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Internal campaign ideas and landing page concepts — confidential to your team.</p>
        <Button onClick={openNew} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Idea
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading ideas...</div>
      ) : ideas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No campaign ideas yet</p>
            <p className="text-slate-400 text-sm mt-1">Add your first idea with optional HTML landing page content</p>
            <Button onClick={openNew} className="mt-4 bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" /> New Idea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ideas.map(idea => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{idea.name}</p>
                        <Badge className={STATUS_STYLES[idea.status]}>{STATUS_LABELS[idea.status]}</Badge>
                        {idea.is_confidential && (
                          <span className="flex items-center gap-1 text-xs text-slate-400"><Lock className="w-3 h-3" /> Confidential</span>
                        )}
                      </div>
                      {idea.description && <p className="text-sm text-slate-500 mt-1">{idea.description}</p>}
                      {idea.html_content_url && (
                        <p className="text-xs text-slate-400 mt-1">HTML landing page attached</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {idea.html_content_url && (
                      <Button size="sm" variant="outline" onClick={() => openPreview(idea)} className="gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5" /> Preview
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(idea)} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(idea)} className="text-slate-400 hover:text-red-500 h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Campaign Idea" : "New Campaign Idea"}</SheetTitle>
            <SheetDescription>Add an idea with optional HTML content for the landing page preview.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <input
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Spring Lawn Care Launch"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description / Notes</label>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the campaign concept..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="idea">Idea</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="confidential"
                checked={form.is_confidential}
                onChange={e => setForm(f => ({ ...f, is_confidential: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="confidential" className="text-sm font-medium text-slate-700">Mark as Confidential</label>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">HTML Landing Page Content</label>
              <p className="text-xs text-slate-400 mb-1">Paste your full HTML here. Click "Preview" on the card to open it as a live page.</p>
              <textarea
                className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 h-64 resize-y"
                value={form.html_content}
                onChange={e => setForm(f => ({ ...f, html_content: e.target.value }))}
                placeholder="<!DOCTYPE html><html>...</html>"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : "Save Idea"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Idea</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}