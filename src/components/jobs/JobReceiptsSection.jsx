import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ReceiptText, Upload, Loader2, Trash2, ChevronDown, ChevronUp, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function JobReceiptsSection({ job, onReceiptsUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const fileRef = useRef();

  const receipts = job?.receipts || [];
  const totalSpent = receipts.reduce((s, r) => s + (r.total || 0), 0);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    // Upload image
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // OCR via LLM
    const newReceiptId = `rcpt_${Date.now()}`;
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
    } catch (_) {
      // OCR failed — save with image only
    }

    const newReceipt = {
      id: newReceiptId,
      image_url: file_url,
      uploaded_at: new Date().toISOString(),
      vendor: parsed?.vendor || "Unknown Vendor",
      date: parsed?.date || null,
      total: parsed?.total || 0,
      category: parsed?.category || "Other",
      items: parsed?.items || [],
      notes: parsed?.notes || "",
      ocr_processed: !!parsed,
    };

    const updatedReceipts = [...receipts, newReceipt];
    await base44.entities.Job.update(job.id, { receipts: updatedReceipts });
    onReceiptsUpdated(updatedReceipts);
    setUploading(false);
    // Reset input
    fileRef.current.value = "";
  }

  async function handleDelete(receiptId) {
    if (!confirm("Remove this receipt?")) return;
    const updatedReceipts = receipts.filter(r => r.id !== receiptId);
    await base44.entities.Job.update(job.id, { receipts: updatedReceipts });
    onReceiptsUpdated(updatedReceipts);
  }

  const CATEGORY_COLORS = {
    Materials: "bg-blue-100 text-blue-700",
    Tools: "bg-purple-100 text-purple-700",
    Fuel: "bg-amber-100 text-amber-700",
    Food: "bg-orange-100 text-orange-700",
    Subcontractor: "bg-rose-100 text-rose-700",
    Other: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <ReceiptText className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-800">Receipts & Job Expenses</h3>
          {receipts.length > 0 && (
            <Badge className="bg-slate-100 text-slate-600 text-xs ml-1">
              {receipts.length} · ${totalSpent.toFixed(2)}
            </Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Upload button */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={uploading}
              onClick={() => fileRef.current.click()}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Scanning receipt...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload Receipt</>
              )}
            </Button>
            <p className="text-xs text-slate-400 mt-1">Takes a photo of a receipt — we'll auto-extract vendor, amount, and items via OCR.</p>
          </div>

          {/* Receipt list */}
          {receipts.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No receipts uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map(receipt => (
                <div key={receipt.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  {/* Thumbnail */}
                  <a href={receipt.image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <img
                      src={receipt.image_url}
                      alt="Receipt"
                      className="w-16 h-16 object-cover rounded-md border border-slate-200 hover:opacity-80 transition-opacity"
                    />
                  </a>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{receipt.vendor}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {receipt.date && (
                            <span className="text-xs text-slate-400">
                              {format(new Date(receipt.date), "MMM d, yyyy")}
                            </span>
                          )}
                          <Badge className={`text-xs ${CATEGORY_COLORS[receipt.category] || CATEGORY_COLORS.Other}`}>
                            {receipt.category}
                          </Badge>
                          {!receipt.ocr_processed && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-500">
                              <AlertCircle className="w-3 h-3" /> OCR failed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-900">${(receipt.total || 0).toFixed(2)}</span>
                        <a href={receipt.image_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => handleDelete(receipt.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Line items */}
                    {receipt.items?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {receipt.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-500">
                            <span className="truncate mr-2">{item.description}</span>
                            <span className="flex-shrink-0">${(item.amount || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {receipt.notes && (
                      <p className="text-xs text-slate-400 mt-1 italic">{receipt.notes}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-600">Total Receipts</span>
                <span className="text-sm font-bold text-slate-900">${totalSpent.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}