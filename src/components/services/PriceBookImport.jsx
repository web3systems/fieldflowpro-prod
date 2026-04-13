import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Check, AlertCircle } from "lucide-react";

const SERVICE_TREE = {
  "Labor": ["General Labor", "Skilled Labor", "Supervision"],
  "Installation": ["Flooring", "Cabinets & Millwork", "Doors & Windows", "Roofing", "Siding"],
  "Painting": ["Interior Painting", "Exterior Painting", "Staining & Finishing"],
  "Plumbing Services": ["Rough-In", "Finish Plumbing", "Drain & Sewer"],
  "Electrical Services": ["Rough-In Wiring", "Panel & Service", "Finish Electrical", "Low Voltage"],
  "HVAC Services": ["Ductwork", "Equipment Install", "Service & Repair"],
  "Cleaning": ["Post-Construction", "Pressure Washing", "Window Cleaning"],
  "Inspection & Consulting": ["Site Visit", "Estimate", "Code Compliance"],
  "Other": ["Miscellaneous"],
};

const MATERIAL_TREE = {
  "Lumber": ["Plywood & Sheathing", "Posts & Beams", "Dimensional Lumber (2x4, 2x6, etc.)", "Trim & Molding", "Engineered Wood"],
  "Concrete & Masonry": ["Concrete Mix", "Block & Brick", "Stucco & Mortar", "Rebar & Wire"],
  "Plumbing": ["PVC Pipe & Fittings", "Copper Pipe & Fittings", "PEX Tubing", "Valves & Controls", "Fixtures"],
  "Electrical": ["Wire & Cable", "Conduit", "Boxes & Devices", "Panels & Breakers", "Fixtures & Lighting"],
  "HVAC": ["Ductwork", "Insulation", "Vents & Registers", "Equipment"],
  "Roofing": ["Shingles", "Underlayment", "Flashing", "Gutters & Downspouts"],
  "Flooring": ["Hardwood", "Tile", "Laminate & LVP", "Carpet", "Subfloor"],
  "Drywall & Insulation": ["Drywall Sheets", "Joint Compound", "Tape & Beads", "Batt Insulation", "Rigid Foam"],
  "Doors & Windows": ["Interior Doors", "Exterior Doors", "Windows", "Hardware"],
  "Paint & Finishes": ["Interior Paint", "Exterior Paint", "Primer", "Stain & Sealer", "Caulk & Adhesive"],
  "Hardware & Fasteners": ["Nails & Screws", "Anchors & Bolts", "Straps & Connectors", "Hinges & Brackets"],
  "Landscaping": ["Soil & Mulch", "Pavers & Stone", "Plants & Sod", "Irrigation"],
  "Other": ["Miscellaneous"],
};

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cols = [];
    let cur = "", inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === "," && !inQuote) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ""; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

export default function PriceBookImport({ companyId, onDone, onClose }) {
  const fileRef = useRef();
  const [step, setStep] = useState("upload"); // upload | processing | preview | importing | done
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setStep("processing");

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (rows.length === 0) {
      setError("No data rows found in the CSV.");
      setStep("upload");
      return;
    }

    // Use AI to map columns and categorize
    const prompt = `You are a construction materials expert. I have a CSV export from a hardware store (Lowe's or Home Depot).

CSV Headers: ${headers.join(", ")}
Sample rows (first 5):
${rows.slice(0, 5).map(r => JSON.stringify(r)).join("\n")}

Total rows: ${rows.length}

All rows:
${rows.map((r, i) => `${i}|${JSON.stringify(r)}`).join("\n")}

Tasks:
1. Map each row to: name, sku (optional), unit_price (number, 0 if unknown), unit (one of: flat/hourly/per_sqft/per_unit/per_lb/per_ft/each — use "each" for most materials), description (optional)
2. Classify each as item_type: "material" (default for hardware store items) or "service"
3. Assign category and subcategory from the MATERIAL TREE:
${JSON.stringify(MATERIAL_TREE)}
Or SERVICE TREE if it's a service:
${JSON.stringify(SERVICE_TREE)}

Return a JSON object with key "items" containing an array of objects with: name, sku, unit_price, unit, description, item_type, category, subcategory.
Only include rows with a valid name. Max 200 items.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sku: { type: "string" },
                unit_price: { type: "number" },
                unit: { type: "string" },
                description: { type: "string" },
                item_type: { type: "string" },
                category: { type: "string" },
                subcategory: { type: "string" },
              }
            }
          }
        }
      }
    });

    const parsed = result?.items || [];
    if (parsed.length === 0) {
      setError("Could not parse any items from the file. Please check the format.");
      setStep("upload");
      return;
    }

    setItems(parsed);
    setStep("preview");
  }

  async function handleImport() {
    setStep("importing");
    let count = 0;
    // Import in batches of 20
    const batch = items.map(item => ({
      ...item,
      company_id: companyId,
      unit_price: parseFloat(item.unit_price) || 0,
      unit: item.unit || "each",
      item_type: item.item_type || "material",
      is_active: true,
      taxable: true,
    }));

    for (let i = 0; i < batch.length; i += 20) {
      const chunk = batch.slice(i, i + 20);
      await Promise.all(chunk.map(item => base44.entities.Service.create(item)));
      count += chunk.length;
      setImportedCount(count);
    }

    setStep("done");
    setImportedCount(count);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Import from CSV</h2>
            <p className="text-sm text-slate-500">Import items exported from Lowe's, Home Depot, or any spreadsheet</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP: upload */}
          {(step === "upload" || step === "processing") && (
            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p className="font-semibold">How to export from Lowe's / Home Depot:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li><strong>Lowe's:</strong> Go to your List → "Share" → "Export to CSV"</li>
                  <li><strong>Home Depot:</strong> Go to your List → "Download" → CSV</li>
                  <li>Or paste any spreadsheet saved as CSV with columns like Name, Price, SKU</li>
                </ul>
              </div>

              <div
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="font-medium text-slate-700">Click to upload your CSV file</p>
                <p className="text-sm text-slate-400 mt-1">Supports .csv files from any source</p>
                {fileName && <p className="mt-2 text-sm font-medium text-blue-600"><FileText className="inline w-4 h-4 mr-1" />{fileName}</p>}
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              {step === "processing" && (
                <div className="flex items-center gap-3 text-blue-600 justify-center py-2">
                  <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-sm font-medium">AI is reading and categorizing your items…</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{items.length} items</span> ready to import</p>
                <button onClick={() => { setStep("upload"); setItems([]); }} className="text-xs text-blue-600 hover:underline">← Upload different file</button>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-2 border-b">
                  <span className="col-span-4">Name</span>
                  <span className="col-span-3">Category</span>
                  <span className="col-span-2">Price</span>
                  <span className="col-span-2">Unit</span>
                  <span className="col-span-1">Type</span>
                </div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 text-xs px-3 py-2 hover:bg-slate-50">
                      <div className="col-span-4 font-medium text-slate-800 truncate pr-2">
                        {item.name}
                        {item.sku && <span className="ml-1 text-slate-400 font-mono">#{item.sku}</span>}
                      </div>
                      <div className="col-span-3 text-slate-500 truncate pr-2">{item.category} › {item.subcategory}</div>
                      <div className="col-span-2 text-slate-700">${(parseFloat(item.unit_price) || 0).toFixed(2)}</div>
                      <div className="col-span-2 text-slate-500">{item.unit}</div>
                      <div className="col-span-1">
                        <Badge variant="secondary" className="text-xs px-1">{item.item_type === "service" ? "Svc" : "Mat"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-700 font-medium">Importing items… {importedCount} / {items.length}</p>
            </div>
          )}

          {/* STEP: done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-xl font-semibold text-slate-800">Import Complete!</p>
              <p className="text-slate-500">{importedCount} items added to your Price Book.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 flex-shrink-0">
          {step === "done" ? (
            <Button onClick={() => { onDone(); onClose(); }} className="bg-blue-600 hover:bg-blue-700">View Price Book</Button>
          ) : step === "preview" ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleImport} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Upload className="w-4 h-4" /> Import {items.length} Items
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          )}
        </div>
      </div>
    </div>
  );
}