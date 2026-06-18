import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import { useModules } from "@/hooks/useModules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Camera, Loader2, ReceiptText, CheckCircle2, Trash2,
  ExternalLink, AlertCircle, Briefcase, X, Upload
} from "lucide-react";
import { format } from "date-fns";

const CATEGORY_COLORS = {
  Materials: "bg-blue-100 text-blue-700",
  Tools: "bg-purple-100 text-purple-700",
  Fuel: "bg-amber-100 text-amber-700",
  Food: "bg-orange-100 text-orange-700",
  Subcontractor: "bg-rose-100 text-rose-700",
  Other: "bg-slate-100 text-slate-600",
};

export default function ReceiptScanner() {
  const { activeCompany } = useApp();
  const { hasModule, loading: moduleLoading } = useModules(activeCompany?.id);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [ocrResult, setOcrResult] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const fileRef = useRef();

  const moduleActive = hasModule("receipt_scanner");

  useEffect(() => {
    if (!moduleActive || !activeCompany?.id) return;
    loadJobs();
    loadRecentReceipts();
  }, [activeCompany?.id, moduleActive]);

  async function loadJobs() {
    setJobsLoading(true);
    try {
      const j = await base44.entities.Job.filter({ company_id: activeCompany.id }, "-updated_date", 100);
      setJobs(j);
    } catch (_) {}
    setJobsLoading(false);
  }

  async function loadRecentReceipts() {
    try {
      const j = await base44.entities.Job.filter({ company_id: activeCompany.id }, "-updated_date", 50);
      const receipts = [];
      j.forEach(job => {
        (job.receipts || []).forEach(r => {
          receipts.push({ ...r, job_id: job.id, job_title: job.title });
        });
      });
      receipts.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
      setRecentReceipts(receipts.slice(0, 30));
    } catch (_) {}
  }

  async function handleCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImageUrl(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to get a permanent URL
    setScanning(true);
    setOcrResult(null);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // OCR via LLM
    let parsed = null;
    try {
      parsed = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an OCR assistant. Extract all data from this receipt image and return it as structured JSON.
Return ONLY valid JSON with these fields:
- vendor: store/company name (string)
- date: date on receipt in YYYY-MM-DD format (string, or null if not found)
- total: total amount paid as a number (no currency symbol)
- category: best category for this expense, one of: Materials, Tools, Fuel, Food, Subcontractor, Other
- items: array of {description: string, amount: number} for each line item
- notes: any other relevant info (string or null)`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            vendor: { type: "string" },
            date: { type: "string" },
            total: { type: "number" },
            category: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number" }
                }
              }
            },
            notes: { type: "string" }
          }
        }
      });
    } catch (_) {}

    setOcrResult({
      image_url: file_url,
      vendor: parsed?.vendor || "Unknown Vendor",
      date: parsed?.date || null,
      total: parsed?.total || 0,
      category: parsed?.category || "Other",
      items: parsed?.items || [],
      notes: parsed?.notes || "",
      ocr_processed: !!parsed,
    });
    setScanning(false);
    fileRef.current.value = "";
  }

  async function handleSave() {
    if (!selectedJobId || !ocrResult) return;
    setSaving(true);
    
    const job = jobs.find(j => j.id === selectedJobId);
    const existingReceipts = job.receipts || [];
    const receipt = {
      id: `rcpt_${Date.now()}`,
      ...ocrResult,
      uploaded_at: new Date().toISOString(),
    };

    await base44.entities.Job.update(selectedJobId, {
      receipts: [...existingReceipts, receipt],
    });

    setImageUrl(null);
    setOcrResult(null);
    setSelectedJobId("");
    setSaving(false);
    await loadRecentReceipts();
  }

  async function handleDelete(receiptId, jobId) {
    if (!confirm("Remove this receipt?")) return;
    const job = jobs.find(j => j.id === jobId) || await base44.entities.Job.get(jobId);
    const updatedReceipts = (job.receipts || []).filter(r => r.id !== receiptId);
    await base44.entities.Job.update(jobId, { receipts: updatedReceipts });
    await loadRecentReceipts();
  }

  function clearScan() {
    setImageUrl(null);
    setOcrResult(null);
  }

  // Module not active — show gate
  if (moduleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!moduleActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Camera className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Receipt Scanner Module</h2>
        <p className="text-slate-500 max-w-md mb-6">
          This module lets you snap receipts with your phone camera, auto-extract vendor/amount/items via AI, and attach them directly to jobs.
        </p>
        <a href="/Marketplace">
          <Button className="bg-blue-600 hover:bg-blue-700">Add from Marketplace →</Button>
        </a>
      </div>
    );
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const totalScanned = recentReceipts.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receipt Scanner</h1>
          <p className="text-slate-500 text-sm">Snap a photo, we extract the details, assign to a job</p>
        </div>
      </div>

      {/* Scan section */}
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <ReceiptText className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Scan a Receipt</h2>
          </div>

          {/* Capture button or preview */}
          {!imageUrl ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-amber-400 transition-colors">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapture}
              />
              <Button
                variant="outline"
                size="lg"
                className="gap-3 h-16 px-8 text-base border-2"
                onClick={() => fileRef.current.click()}
                disabled={scanning}
              >
                {scanning ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> Scanning...</>
                ) : (
                  <><Camera className="w-6 h-6" /> Take Photo</>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-3">
                Opens your camera on mobile, or file picker on desktop
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-64 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Receipt"
                  className="max-w-full max-h-64 object-contain"
                />
                <button
                  onClick={clearScan}
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 shadow hover:bg-white"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>

              {/* OCR result */}
              {scanning ? (
                <div className="flex items-center justify-center gap-3 py-6 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">AI extracting receipt data...</span>
                </div>
              ) : ocrResult ? (
                <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Data extracted</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">Vendor</span>
                      <span className="font-semibold text-slate-800">{ocrResult.vendor}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Date</span>
                      <span className="text-slate-700">
                        {ocrResult.date ? format(new Date(ocrResult.date), "MMM d, yyyy") : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Total</span>
                      <span className="font-bold text-slate-900">${ocrResult.total.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Category</span>
                      <Badge className={`text-xs ${CATEGORY_COLORS[ocrResult.category] || CATEGORY_COLORS.Other}`}>
                        {ocrResult.category}
                      </Badge>
                    </div>
                  </div>

                  {!ocrResult.ocr_processed && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Could not auto-read receipt — you can still save the image
                    </div>
                  )}

                  {/* Line items */}
                  {ocrResult.items?.length > 0 && (
                    <div className="border-t border-slate-200 pt-2 space-y-1">
                      <span className="text-xs text-slate-400">Line Items</span>
                      {ocrResult.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600">
                          <span className="truncate mr-2">{item.description}</span>
                          <span className="flex-shrink-0">${(item.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Job selector + save */}
                  <div className="flex items-end gap-3 pt-2 border-t border-slate-200">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-600 block mb-1">Assign to Job</label>
                      {jobsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading jobs...
                        </div>
                      ) : (
                        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a job..." />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map(j => (
                              <SelectItem key={j.id} value={j.id}>
                                <span className="flex items-center gap-2">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                  {j.title}
                                  {j.status && (
                                    <span className="text-xs text-slate-400 ml-1">({j.status})</span>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={!selectedJobId || saving}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Save to Job</>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent receipts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Recent Receipts</h2>
          {recentReceipts.length > 0 && (
            <Badge className="bg-slate-100 text-slate-600 text-xs">
              {recentReceipts.length} receipts · ${totalScanned.toFixed(2)} total
            </Badge>
          )}
        </div>

        {recentReceipts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <ReceiptText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No receipts scanned yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentReceipts.map(receipt => (
              <div key={receipt.id} className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <a href={receipt.image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="w-14 h-14 object-cover rounded-md border border-slate-200 hover:opacity-80 transition-opacity"
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{receipt.vendor}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {receipt.date && (
                          <span className="text-xs text-slate-400">{format(new Date(receipt.date), "MMM d, yyyy")}</span>
                        )}
                        <Badge className={`text-xs ${CATEGORY_COLORS[receipt.category] || CATEGORY_COLORS.Other}`}>
                          {receipt.category}
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {receipt.job_title}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900">${(receipt.total || 0).toFixed(2)}</span>
                      <a href={receipt.image_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleDelete(receipt.id, receipt.job_id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}