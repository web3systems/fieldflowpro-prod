import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, EyeOff, Copy } from "lucide-react";
import { TEMPLATE_META } from "./TemplateDefaults";

export default function TemplateEditor({ template, company, onSave, onBack, saving }) {
  const [form, setForm] = useState({ ...template });
  const [showPreview, setShowPreview] = useState(false);

  const meta = TEMPLATE_META[form.template_type] || TEMPLATE_META.custom;

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function insertVariable(v) {
    const textarea = document.getElementById("body-html-editor");
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = form.body_html.slice(0, start) + v + form.body_html.slice(end);
      update("body_html", newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + v.length;
        textarea.focus();
      }, 0);
    } else {
      update("body_html", (form.body_html || "") + " " + v);
    }
  }

  const previewHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="background:${form.header_color || "#3B82F6"};padding:24px;text-align:center;">
        ${form.show_logo !== false && (form.logo_url || company?.logo_url)
          ? `<img src="${form.logo_url || company?.logo_url}" style="max-height:60px;margin-bottom:12px;" /><br/>`
          : ""}
        <span style="color:white;font-size:20px;font-weight:bold;">${form.company_name || company?.name || "Your Company"}</span>
      </div>
      <div style="padding:28px;color:#1e293b;line-height:1.6;">
        ${form.body_html || "<p>Email body goes here...</p>"}
      </div>
      ${form.footer_text ? `<div style="background:#f8fafc;padding:16px 28px;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;">${form.footer_text}</div>` : ""}
    </div>
  `;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{form.id ? "Edit Template" : "New Template"}</h2>
          <p className="text-sm text-slate-500">{meta.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1">
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Hide Preview" : "Preview"}
        </Button>
        <Button onClick={() => onSave(form)} disabled={saving} className="gap-1">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          <div>
            <Label>Template Name *</Label>
            <Input value={form.name || ""} onChange={e => update("name", e.target.value)} placeholder="e.g. Job Scheduled Notification" className="mt-1" />
          </div>

          <div>
            <Label>Email Subject</Label>
            <Input value={form.subject || ""} onChange={e => update("subject", e.target.value)} placeholder="e.g. Your appointment is confirmed" className="mt-1" />
          </div>

          {/* Variables */}
          <div>
            <Label className="mb-2 block">Available Variables</Label>
            <div className="flex flex-wrap gap-1.5">
              {meta.variables.map(v => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded font-mono flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-2.5 h-2.5" /> {v}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Click a variable to insert it at your cursor position in the body.</p>
          </div>

          <div>
            <Label>Email Body (HTML)</Label>
            <Textarea
              id="body-html-editor"
              value={form.body_html || ""}
              onChange={e => update("body_html", e.target.value)}
              placeholder="Write your email body here. HTML is supported."
              rows={12}
              className="mt-1 font-mono text-sm"
            />
          </div>

          <div>
            <Label>Footer Text</Label>
            <Textarea
              value={form.footer_text || ""}
              onChange={e => update("footer_text", e.target.value)}
              placeholder="e.g. © 2025 Your Company. All rights reserved."
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Branding */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700">Branding</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Header Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="color" value={form.header_color || "#3B82F6"} onChange={e => update("header_color", e.target.value)} className="w-12 h-9 p-1" />
                  <Input value={form.header_color || "#3B82F6"} onChange={e => update("header_color", e.target.value)} className="text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Accent Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="color" value={form.accent_color || "#1E293B"} onChange={e => update("accent_color", e.target.value)} className="w-12 h-9 p-1" />
                  <Input value={form.accent_color || "#1E293B"} onChange={e => update("accent_color", e.target.value)} className="text-sm" />
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Logo URL</Label>
              <Input value={form.logo_url || ""} onChange={e => update("logo_url", e.target.value)} placeholder="https://..." className="mt-1 text-sm" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.show_logo !== false} onChange={e => update("show_logo", e.target.checked)} />
              <span className="text-sm">Show logo in email header</span>
            </label>
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <div className="sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-slate-700">Live Preview</h3>
              <Badge variant="outline" className="text-xs">Subject: {form.subject || "(no subject)"}</Badge>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <iframe
                srcDoc={previewHtml}
                className="w-full"
                style={{ height: "600px", border: "none" }}
                title="Email Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}