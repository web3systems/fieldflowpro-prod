import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart3, Search, Share2, Code2, CheckCircle2, ExternalLink } from "lucide-react";

const SCHEMA_TYPES = [
  { value: "LocalBusiness", label: "Local Business (General)" },
  { value: "HomeAndConstructionBusiness", label: "Home & Construction" },
  { value: "LandscapingService", label: "Landscaping Service" },
  { value: "HVACBusiness", label: "HVAC Business" },
  { value: "Plumber", label: "Plumber" },
  { value: "Electrician", label: "Electrician" },
  { value: "CleaningService", label: "Cleaning Service" },
  { value: "GeneralContractor", label: "General Contractor" },
];

export default function SeoAnalyticsTab({ company, onSave }) {
  const seo = company?.seo_settings || {};
  const [form, setForm] = useState({
    google_analytics_id: seo.google_analytics_id || "",
    google_tag_manager_id: seo.google_tag_manager_id || "",
    google_search_console_verification: seo.google_search_console_verification || "",
    meta_title: seo.meta_title || "",
    meta_description: seo.meta_description || "",
    meta_keywords: seo.meta_keywords || "",
    og_title: seo.og_title || "",
    og_description: seo.og_description || "",
    og_image_url: seo.og_image_url || "",
    canonical_url: seo.canonical_url || "",
    schema_type: seo.schema_type || "LocalBusiness",
    schema_enabled: seo.schema_enabled !== false,
    facebook_pixel_id: seo.facebook_pixel_id || "",
    bing_uet_id: seo.bing_uet_id || "",
  });
  const [saving, setSaving] = useState(false);

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await base44.entities.Company.update(company.id, { seo_settings: form });
      toast.success("SEO & Analytics settings saved!");
      if (onSave) onSave();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const descLen = form.meta_description.length;

  return (
    <div className="space-y-5">

      {/* Analytics Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">Analytics & Tracking</CardTitle>
          </div>
          <CardDescription>Connect analytics platforms to understand your website traffic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Google Analytics 4 ID
                <Badge className="bg-green-100 text-green-700 text-xs font-normal">Free</Badge>
              </Label>
              <Input
                placeholder="G-XXXXXXXXXX"
                value={form.google_analytics_id}
                onChange={e => update("google_analytics_id", e.target.value)}
              />
              <p className="text-xs text-slate-400">Found in Google Analytics → Admin → Data Streams</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Google Tag Manager ID
                <Badge className="bg-green-100 text-green-700 text-xs font-normal">Free</Badge>
              </Label>
              <Input
                placeholder="GTM-XXXXXXX"
                value={form.google_tag_manager_id}
                onChange={e => update("google_tag_manager_id", e.target.value)}
              />
              <p className="text-xs text-slate-400">Manage all your tags from one place</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Facebook / Meta Pixel ID
                <Badge className="bg-green-100 text-green-700 text-xs font-normal">Free</Badge>
              </Label>
              <Input
                placeholder="123456789012345"
                value={form.facebook_pixel_id}
                onChange={e => update("facebook_pixel_id", e.target.value)}
              />
              <p className="text-xs text-slate-400">Track ad conversions from Facebook/Instagram</p>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                Bing Ads UET Tag ID
                <Badge className="bg-green-100 text-green-700 text-xs font-normal">Free</Badge>
              </Label>
              <Input
                placeholder="XXXXXXXXX"
                value={form.bing_uet_id}
                onChange={e => update("bing_uet_id", e.target.value)}
              />
              <p className="text-xs text-slate-400">Universal Event Tracking for Microsoft Ads</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Engine Optimization */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base">Search Engine Optimization (SEO)</CardTitle>
          </div>
          <CardDescription>Help search engines understand and rank your business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Page Title (SEO)</Label>
            <Input
              placeholder={`${company?.name} — ${company?.industry || "Field Service"} Company`}
              value={form.meta_title}
              onChange={e => update("meta_title", e.target.value)}
            />
            <p className="text-xs text-slate-400">Recommended: 50–60 characters</p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Meta Description</span>
              <span className={`text-xs ${descLen > 160 ? "text-red-500" : descLen > 120 ? "text-amber-500" : "text-slate-400"}`}>
                {descLen}/160
              </span>
            </Label>
            <Textarea
              placeholder={`${company?.name} provides professional ${company?.industry || "field"} services in ${company?.city || "your area"}. Call us for a free estimate!`}
              value={form.meta_description}
              onChange={e => update("meta_description", e.target.value)}
              rows={3}
            />
            <p className="text-xs text-slate-400">Shown in search results below your page title. 150–160 chars is ideal.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Keywords</Label>
            <Input
              placeholder="handyman services, home repair, plumbing, electrical"
              value={form.meta_keywords}
              onChange={e => update("meta_keywords", e.target.value)}
            />
            <p className="text-xs text-slate-400">Comma-separated. Focus on what customers search for.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Google Search Console — Verification Code</Label>
            <Input
              placeholder="abc123def456..."
              value={form.google_search_console_verification}
              onChange={e => update("google_search_console_verification", e.target.value)}
            />
            <p className="text-xs text-slate-400">
              Get this from{" "}
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                Google Search Console <ExternalLink className="w-3 h-3" />
              </a>
              {" "}→ HTML tag method (content value only)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Canonical URL</Label>
            <Input
              placeholder="https://yourwebsite.com"
              value={form.canonical_url}
              onChange={e => update("canonical_url", e.target.value)}
            />
            <p className="text-xs text-slate-400">Your main business website URL</p>
          </div>
        </CardContent>
      </Card>

      {/* Structured Data / JSON-LD */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-base">Structured Data (Rich Results)</CardTitle>
          </div>
          <CardDescription>Automatically generate JSON-LD schema to get rich search result features like reviews and hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-slate-800">Enable JSON-LD Schema</p>
              <p className="text-xs text-slate-500">Auto-generates structured data for search engines</p>
            </div>
            <Switch
              checked={form.schema_enabled}
              onCheckedChange={v => update("schema_enabled", v)}
            />
          </div>

          {form.schema_enabled && (
            <div className="space-y-1.5">
              <Label>Business Schema Type</Label>
              <Select value={form.schema_type} onValueChange={v => update("schema_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">Choose the type that best matches your business for better search visibility</p>
            </div>
          )}

          {form.schema_enabled && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">Schema will include</p>
                  <ul className="text-xs text-green-700 mt-1 space-y-0.5 list-disc list-inside">
                    <li>Business name, phone, address</li>
                    <li>Website URL &amp; email</li>
                    <li>Business type &amp; industry</li>
                    <li>Google review link (if set)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Sharing */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-600" />
            <CardTitle className="text-base">Social Media Sharing (Open Graph)</CardTitle>
          </div>
          <CardDescription>Control how your pages look when shared on Facebook, LinkedIn, and other platforms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Share Title</Label>
            <Input
              placeholder={form.meta_title || company?.name}
              value={form.og_title}
              onChange={e => update("og_title", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Share Description</Label>
            <Textarea
              placeholder={form.meta_description || "Professional field services you can trust."}
              value={form.og_description}
              onChange={e => update("og_description", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Share Image URL</Label>
            <Input
              placeholder="https://yoursite.com/share-image.jpg"
              value={form.og_image_url}
              onChange={e => update("og_image_url", e.target.value)}
            />
            <p className="text-xs text-slate-400">Recommended: 1200×630px. Use your logo or a job photo.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
        {saving ? "Saving..." : "Save SEO & Analytics Settings"}
      </Button>
    </div>
  );
}