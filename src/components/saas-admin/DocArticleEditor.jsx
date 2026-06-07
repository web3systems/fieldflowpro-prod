import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill from "react-quill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Eye, EyeOff, Image } from "lucide-react";

const SECTION_OPTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leads", label: "Leads" },
  { id: "customers", label: "Customers" },
  { id: "estimates", label: "Estimates" },
  { id: "jobs", label: "Jobs" },
  { id: "schedule", label: "Schedule" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "notifications", label: "Notifications" },
  { id: "messages", label: "Messages" },
  { id: "accounting", label: "Accounting" },
  { id: "team", label: "Team" },
  { id: "pricebook", label: "Price Book" },
  { id: "settings", label: "Company Settings" },
  { id: "email-templates", label: "Email Templates" },
  { id: "employees", label: "Employees" },
  { id: "customer-portal", label: "Customer Portal" },
  { id: "general", label: "General" },
];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "color", "background", "list", "bullet", "indent",
  "blockquote", "code-block", "link", "image",
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function DocArticleEditor({ article, onSave, onCancel }) {
  const isNew = !article?.id;
  const [form, setForm] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    section_id: article?.section_id || "general",
    section_label: article?.section_label || "General",
    tag: article?.tag || "All Users",
    summary: article?.summary || "",
    body_html: article?.body_html || "",
    is_published: article?.is_published ?? true,
    sort_order: article?.sort_order ?? 0,
    article_type: article?.article_type || "guide",
    featured_image_url: article?.featured_image_url || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleTitleChange = (val) => {
    set("title", val);
    if (isNew) set("slug", slugify(val));
  };

  const handleSectionChange = (id) => {
    const sec = SECTION_OPTIONS.find(s => s.id === id);
    setForm(f => ({ ...f, section_id: id, section_label: sec?.label || id }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await base44.entities.DocArticle.create(form);
      } else {
        await base44.entities.DocArticle.update(article.id, form);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? "New Article" : "Edit Article"}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set("is_published", !form.is_published)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              form.is_published
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-slate-50 border-slate-200 text-slate-500"
            }`}
          >
            {form.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {form.is_published ? "Published" : "Draft"}
          </button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()} size="sm">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Article"}
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <div className="px-8 pt-6 pb-2">
            <input
              type="text"
              placeholder="Article title..."
              value={form.title}
              onChange={e => handleTitleChange(e.target.value)}
              className="w-full text-3xl font-bold text-slate-900 placeholder-slate-300 border-none outline-none bg-transparent"
            />
            <input
              type="text"
              placeholder="Short summary (shown in doc index)..."
              value={form.summary}
              onChange={e => set("summary", e.target.value)}
              className="w-full text-base text-slate-500 placeholder-slate-300 border-none outline-none bg-transparent mt-2"
            />
          </div>

          {/* Rich Editor */}
          <div className="flex-1 px-8 pb-8 overflow-y-auto">
            <div className="min-h-96">
              <ReactQuill
                theme="snow"
                value={form.body_html}
                onChange={val => set("body_html", val)}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Start writing your documentation article..."
                style={{ height: "calc(100% - 42px)" }}
              />
            </div>
          </div>
        </div>

        {/* Right sidebar — metadata */}
        <div className="w-72 border-l border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0 p-5 space-y-5">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Section</Label>
            <Select value={form.section_id} onValueChange={handleSectionChange}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTION_OPTIONS.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Audience</Label>
            <Select value={form.tag} onValueChange={v => set("tag", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Users">All Users</SelectItem>
                <SelectItem value="Managers & Admins">Managers & Admins</SelectItem>
                <SelectItem value="Admins Only">Admins Only</SelectItem>
                <SelectItem value="Customers">Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Article Type</Label>
            <Select value={form.article_type} onValueChange={v => set("article_type", v)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guide">Guide</SelectItem>
                <SelectItem value="faq">FAQ</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="changelog">Changelog</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Sort Order</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={e => set("sort_order", parseInt(e.target.value) || 0)}
              className="bg-white"
              min={0}
            />
            <p className="text-xs text-slate-400 mt-1">Lower number = appears first</p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">URL Slug</Label>
            <Input
              value={form.slug}
              onChange={e => set("slug", slugify(e.target.value))}
              className="bg-white font-mono text-xs"
              placeholder="auto-generated"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Featured Image URL</Label>
            <Input
              value={form.featured_image_url}
              onChange={e => set("featured_image_url", e.target.value)}
              className="bg-white text-xs"
              placeholder="https://..."
            />
            {form.featured_image_url && (
              <img src={form.featured_image_url} alt="preview" className="mt-2 rounded-lg w-full object-cover h-24" onError={e => e.target.style.display = "none"} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}