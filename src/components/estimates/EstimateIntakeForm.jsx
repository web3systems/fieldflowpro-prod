import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Image } from "lucide-react";
import MediaUploader from "./MediaUploader";

const JOB_TYPES = [
  "Bathroom Renovation", "Kitchen Renovation", "Deck / Patio Repair",
  "Drywall / Plastering", "Painting - Interior", "Painting - Exterior",
  "Plumbing", "Electrical", "Flooring", "Roofing", "Landscaping",
  "Cleaning", "HVAC", "Carpentry", "Fencing", "Other"
];

export default function EstimateIntakeForm({ customers, services, company, onEstimateReady }) {
  const [form, setForm] = useState({
    customer_id: "",
    job_type: "",
    location: "",
    scope: "",
    materials_known: "",
    estimated_hours: "",
    special_notes: "",
  });
  const [attachedMedia, setAttachedMedia] = useState([]);
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleGenerate() {
    if (!form.job_type || !form.scope) return;
    setLoading(true);

    const serviceList = services.map(s => `${s.name} ($${s.unit_price}/${s.unit})`).join(", ");
    const customerList = customers.map(c => `${c.first_name} ${c.last_name} (id: ${c.id})`).join(", ");
    const selectedCustomer = customers.find(c => c.id === form.customer_id);
    const imageUrls = attachedMedia.filter(m => m.type === "image").map(m => m.url);

    const prompt = `You are an AI estimator for a field service company called "${company?.name || "the company"}".

Build a complete, professional estimate based on the technician's job intake form below.

--- JOB INTAKE FORM ---
Job Type: ${form.job_type}
Customer: ${selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name} (id: ${selectedCustomer.id})` : "Not specified"}
Location / Property: ${form.location || "Not specified"}
Scope of Work: ${form.scope}
Known Materials: ${form.materials_known || "Not specified — estimate as needed"}
Estimated Labor Hours: ${form.estimated_hours || "Not specified — estimate based on scope"}
Special Notes: ${form.special_notes || "None"}
${imageUrls.length > 0 ? `\nAttached Photos: ${imageUrls.length} photo(s) provided for visual context.` : ""}
--- END FORM ---

Available services/pricing catalog: ${serviceList || "none on file"}
Available customers: ${customerList || "none on file"}

Generate a detailed estimate with realistic line items (labor + materials). Use catalog pricing where applicable.

Respond with ONLY this JSON (no other text):
\`\`\`estimate_ready
{
  "title": "Job title",
  "customer_id": "${form.customer_id || "null"}",
  "notes": "any relevant notes",
  "line_items": [
    { "description": "Labor - description", "quantity": 2, "unit_price": 75, "total": 150, "service_id": null }
  ],
  "subtotal": 0,
  "tax_rate": 0,
  "tax_amount": 0,
  "discount": 0,
  "total": 0,
  "summary": "One sentence summary"
}
\`\`\``;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
      file_urls: imageUrls.length > 0 ? imageUrls : undefined,
    });

    const match = aiResponse.match(/```estimate_ready\n([\s\S]*?)\n```/);
    if (match) {
      const estimateData = JSON.parse(match[1]);
      onEstimateReady(estimateData);
    }

    setLoading(false);
  }

  const isReady = form.job_type && form.scope.trim().length > 10;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-purple-700">Fill out this quick form and the AI will instantly generate a professional estimate.</p>
        </div>

        {/* Customer */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Customer</Label>
          <Select value={form.customer_id} onValueChange={v => set("customer_id", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select customer..." /></SelectTrigger>
            <SelectContent>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Job Type */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Job Type <span className="text-red-500">*</span></Label>
          <Select value={form.job_type} onValueChange={v => set("job_type", v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select job type..." /></SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Location / Property Details</Label>
          <Input
            value={form.location}
            onChange={e => set("location", e.target.value)}
            placeholder="e.g. 2-story home, 2nd floor bathroom, approx 80 sq ft"
            className="text-sm"
          />
        </div>

        {/* Scope */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Scope of Work <span className="text-red-500">*</span></Label>
          <Textarea
            value={form.scope}
            onChange={e => set("scope", e.target.value)}
            placeholder="Describe what needs to be done in detail. e.g. Remove old tile flooring, prep subfloor, install new 12x12 ceramic tile throughout..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>

        {/* Materials */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Known Materials Needed</Label>
          <Input
            value={form.materials_known}
            onChange={e => set("materials_known", e.target.value)}
            placeholder="e.g. 100 sq ft ceramic tile, grout, thin-set mortar"
            className="text-sm"
          />
        </div>

        {/* Hours */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Estimated Labor Hours</Label>
          <Input
            value={form.estimated_hours}
            onChange={e => set("estimated_hours", e.target.value)}
            placeholder="e.g. 8 hours / 2 days"
            className="text-sm"
          />
        </div>

        {/* Special Notes */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">Special Notes / Conditions</Label>
          <Textarea
            value={form.special_notes}
            onChange={e => set("special_notes", e.target.value)}
            placeholder="e.g. Customer already purchased tile. Requires moving furniture. Access restricted to weekdays."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Photos */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 mb-1 block">
            <span className="flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Attach Photos (optional)</span>
          </Label>
          <MediaUploader onMediaUploaded={entry => setAttachedMedia(prev => [...prev, entry])} />
          {attachedMedia.length > 0 && (
            <p className="text-xs text-purple-600 mt-1">{attachedMedia.length} photo{attachedMedia.length > 1 ? "s" : ""} attached</p>
          )}
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!isReady || loading}
          className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating Estimate...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Estimate with AI</>
          )}
        </Button>
        {!isReady && (
          <p className="text-xs text-slate-400 text-center">Job Type and Scope of Work are required</p>
        )}
      </div>
    </div>
  );
}