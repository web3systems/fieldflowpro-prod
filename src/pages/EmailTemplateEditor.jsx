import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../layout.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";

export default function EmailTemplateEditor() {
  const { activeCompany } = useApp();
  const [templates, setTemplates] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!activeCompany?.id) return;
    loadTemplates();
  }, [activeCompany?.id]);

  async function loadTemplates() {
    try {
      const estimate = await base44.entities.EmailTemplate.filter({
        company_id: activeCompany.id,
        template_type: "estimate"
      });
      const invoice = await base44.entities.EmailTemplate.filter({
        company_id: activeCompany.id,
        template_type: "invoice"
      });

      setTemplates({
        estimate: estimate[0] || { company_id: activeCompany.id, template_type: "estimate" },
        invoice: invoice[0] || { company_id: activeCompany.id, template_type: "invoice" }
      });
    } catch (e) {
      console.error("Error loading templates:", e);
    }
  }

  async function saveTemplate(type) {
    setSaving(true);
    setMessage("");
    try {
      const template = templates[type];
      if (template.id) {
        await base44.entities.EmailTemplate.update(template.id, template);
      } else {
        await base44.entities.EmailTemplate.create(template);
      }
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} template saved!`);
      loadTemplates();
    } catch (e) {
      setMessage("Error saving template: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function updateTemplate(type, field, value) {
    setTemplates(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  }

  const renderTemplate = (type) => {
    const t = templates[type];
    if (!t) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name</label>
              <Input
                value={t.company_name || activeCompany?.name || ""}
                onChange={(e) => updateTemplate(type, "company_name", e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company Phone</label>
              <Input
                value={t.company_phone || activeCompany?.phone || ""}
                onChange={(e) => updateTemplate(type, "company_phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Company Email</label>
              <Input
                value={t.company_email || activeCompany?.email || ""}
                onChange={(e) => updateTemplate(type, "company_email", e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Logo URL</label>
              <Input
                value={t.logo_url || activeCompany?.logo_url || ""}
                onChange={(e) => updateTemplate(type, "logo_url", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Header Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={t.header_color || "#FFC107"}
                  onChange={(e) => updateTemplate(type, "header_color", e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={t.header_color || "#FFC107"}
                  onChange={(e) => updateTemplate(type, "header_color", e.target.value)}
                  placeholder="#FFC107"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Accent Color</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={t.accent_color || "#2C3E50"}
                  onChange={(e) => updateTemplate(type, "accent_color", e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={t.accent_color || "#2C3E50"}
                  onChange={(e) => updateTemplate(type, "accent_color", e.target.value)}
                  placeholder="#2C3E50"
                />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={t.show_logo !== false}
                  onChange={(e) => updateTemplate(type, "show_logo", e.target.checked)}
                />
                <span className="text-sm font-medium">Show company logo</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Footer Text</label>
          <Textarea
            value={t.footer_text || ""}
            onChange={(e) => updateTemplate(type, "footer_text", e.target.value)}
            placeholder="Add custom footer text..."
            rows={3}
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Preview</h4>
          <div
            className="p-4 rounded border"
            style={{
              background: `linear-gradient(135deg, ${t.header_color || "#FFC107"} 0%, ${t.header_color || "#FFC107"}dd 100%)`
            }}
          >
            {t.show_logo !== false && t.logo_url && (
              <img src={t.logo_url} alt="Logo" style={{ maxHeight: "60px", marginBottom: "16px" }} />
            )}
            <div style={{ color: "white", fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
              {type === "estimate" ? "Estimate" : "Invoice"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>
              {type === "estimate" ? "We've prepared an estimate for your project" : "Payment due"}
            </div>
          </div>
        </div>

        <Button onClick={() => saveTemplate(type)} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>
    );
  };

  if (!activeCompany) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle className="w-4 h-4" />
          <span>Please select a company to edit templates</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <p className="text-muted-foreground mt-2">Customize how estimates and invoices look in customer emails</p>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {message}
        </div>
      )}

      <Tabs defaultValue="estimate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="estimate">Estimate Template</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Template</TabsTrigger>
        </TabsList>
        <TabsContent value="estimate">
          <Card>
            <CardHeader>
              <CardTitle>Estimate Email Template</CardTitle>
              <CardDescription>Customize how estimates are displayed in customer emails</CardDescription>
            </CardHeader>
            <CardContent>{renderTemplate("estimate")}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Email Template</CardTitle>
              <CardDescription>Customize how invoices are displayed in customer emails</CardDescription>
            </CardHeader>
            <CardContent>{renderTemplate("invoice")}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}