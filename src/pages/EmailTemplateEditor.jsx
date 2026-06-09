import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../layout.jsx";
import { AlertCircle } from "lucide-react";
import TemplateList from "@/components/email-templates/TemplateList";
import TemplateEditor from "@/components/email-templates/TemplateEditor";
import { DEFAULT_TEMPLATES, TEMPLATE_META } from "@/components/email-templates/TemplateDefaults";

export default function EmailTemplateEditor() {
  const { activeCompany } = useApp();
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null); // null = list view, object = edit view
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany?.id) loadTemplates();
  }, [activeCompany?.id]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const list = await base44.entities.EmailTemplate.filter({ company_id: activeCompany.id });
      setTemplates(list);
    } catch (e) {
      console.error("Error loading templates:", e);
    }
    setLoading(false);
  }

  async function handleSave(form) {
    setSaving(true);
    try {
      const data = { ...form, company_id: activeCompany.id };
      if (form.id) {
        await base44.entities.EmailTemplate.update(form.id, data);
      } else {
        await base44.entities.EmailTemplate.create(data);
      }
      await loadTemplates();
      setEditing(null);
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  }

  async function handleDelete(template) {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    await base44.entities.EmailTemplate.delete(template.id);
    await loadTemplates();
  }

  async function handleDuplicate(template) {
    const { id, created_date, updated_date, ...rest } = template;
    const copy = { ...rest, name: `${template.name} (Copy)`, is_default: false };
    await base44.entities.EmailTemplate.create(copy);
    await loadTemplates();
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      for (const [type, defaults] of Object.entries(DEFAULT_TEMPLATES)) {
        // Don't duplicate existing types
        const exists = templates.some(t => t.template_type === type && t.is_default);
        if (!exists) {
          await base44.entities.EmailTemplate.create({
            company_id: activeCompany.id,
            template_type: type,
            is_default: true,
            is_active: true,
            header_color: "#3B82F6",
            accent_color: "#1E293B",
            show_logo: true,
            company_name: activeCompany.name || "",
            company_phone: activeCompany.phone || "",
            company_email: activeCompany.email || "",
            logo_url: activeCompany.logo_url || "",
            ...defaults,
          });
        }
      }
      await loadTemplates();
    } catch (e) {
      console.error("Seeding error:", e);
    }
    setSeeding(false);
  }

  function handleNew(seedAll = false) {
    if (seedAll === true) {
      seedDefaults();
      return;
    }
    setEditing({
      company_id: activeCompany.id,
      template_type: "custom",
      name: "",
      subject: "",
      body_html: "",
      header_color: "#3B82F6",
      accent_color: "#1E293B",
      show_logo: true,
      is_active: true,
      is_default: false,
    });
  }

  if (!activeCompany) {
    return (
      <div className="p-6 flex items-center gap-2 text-amber-600">
        <AlertCircle className="w-4 h-4" />
        <span>Please select a company to manage email templates.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        Loading templates...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {editing ? (
        <TemplateEditor
          template={editing}
          company={activeCompany}
          onSave={handleSave}
          onBack={() => setEditing(null)}
          saving={saving}
        />
      ) : (
        <TemplateList
          templates={templates}
          onEdit={setEditing}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onNew={handleNew}
          seeding={seeding}
        />
      )}
    </div>
  );
}