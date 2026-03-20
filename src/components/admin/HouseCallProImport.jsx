import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertTriangle, FileText, Users, Briefcase, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += char; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || "").replace(/"/g, "").trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

// Map HouseCall Pro customer fields to FieldFlow Pro Customer entity
function mapCustomer(row, companyId) {
  return {
    company_id: companyId,
    first_name: row["first name"] || row["firstname"] || row["first_name"] || row["name"]?.split(" ")[0] || "",
    last_name: row["last name"] || row["lastname"] || row["last_name"] || row["name"]?.split(" ").slice(1).join(" ") || "",
    email: row["email"] || row["email address"] || "",
    phone: row["phone"] || row["mobile"] || row["phone number"] || row["cell phone"] || "",
    address: row["address"] || row["street"] || row["billing address"] || "",
    city: row["city"] || row["billing city"] || "",
    state: row["state"] || row["billing state"] || "",
    zip: row["zip"] || row["zip code"] || row["postal code"] || row["billing zip"] || "",
    notes: row["notes"] || row["customer notes"] || row["internal notes"] || "",
    status: "active",
    source: "manual",
    imported: true,
  };
}

// Map HouseCall Pro estimate fields to FieldFlow Pro Estimate entity
function mapEstimate(row, companyId) {
  const wonValue = parseFloat((row["won value"] || "0").replace(/[$,]/g, "")) || 0;
  const lostValue = parseFloat((row["lost value"] || "0").replace(/[$,]/g, "")) || 0;
  const openValue = parseFloat((row["open value"] || "0").replace(/[$,]/g, "")) || 0;
  const total = wonValue || lostValue || openValue || 0;

  const statusRaw = (row["estimate status"] || "").toLowerCase();
  let status = "draft";
  if (statusRaw.includes("approved") || statusRaw.includes("pro approved")) status = "approved";
  else if (statusRaw.includes("declined") || statusRaw.includes("pro declined")) status = "declined";
  else if (statusRaw.includes("expired")) status = "expired";
  else if (statusRaw.includes("sent")) status = "sent";

  return {
    company_id: companyId,
    customer_id: "",
    estimate_number: row["estimate #"] || row["estimate#"] || "",
    title: `Estimate #${row["estimate #"] || ""}${row["customer name"] ? " — " + row["customer name"] : ""}`,
    status,
    total,
    subtotal: total,
    notes: [
      row["estimate tags"] ? `Tags: ${row["estimate tags"]}` : "",
      row["employees"] ? `Assigned: ${row["employees"]}` : "",
      row["outcome"] ? `Outcome: ${row["outcome"]}` : "",
    ].filter(Boolean).join("\n") || "",
    valid_until: row["scheduled date"] ? new Date(row["scheduled date"]).toISOString().split("T")[0] : "",
    imported: true,
  };
}

// Map HouseCall Pro invoice fields to FieldFlow Pro Invoice entity
function mapInvoice(row, companyId) {
  const amountDue = parseFloat((row["amount due"] || "0").replace(/[$,]/g, "")) || 0;
  const statusRaw = (row["invoice status"] || "").toLowerCase();
  let status = "draft";
  if (statusRaw.includes("paid")) status = "paid";
  else if (statusRaw.includes("open")) status = "sent";
  else if (statusRaw.includes("overdue")) status = "overdue";
  else if (statusRaw.includes("void")) status = "void";

  const dueDateRaw = row["due date"] || row["latest send date"] || "";
  let due_date = "";
  if (dueDateRaw) {
    try { due_date = new Date(dueDateRaw).toISOString().split("T")[0]; } catch {}
  }

  return {
    company_id: companyId,
    customer_id: "",
    invoice_number: row["invoice #"] || row["invoice#"] || "",
    status,
    total: amountDue,
    subtotal: amountDue,
    amount_paid: status === "paid" ? amountDue : 0,
    due_date,
    notes: row["job #"] ? `HouseCall Pro Job #${row["job #"]}` : "",
    imported: true,
  };
}

// Map HouseCall Pro job fields to FieldFlow Pro Job entity
function mapJob(row, companyId) {
  return {
    company_id: companyId,
    customer_id: "", // Will need manual linking
    title: row["job title"] || row["title"] || row["service"] || row["job type"] || "Imported Job",
    description: row["description"] || row["job description"] || row["notes"] || "",
    status: (() => {
      const s = (row["status"] || row["job status"] || "").toLowerCase();
      if (s.includes("complete")) return "completed";
      if (s.includes("progress") || s.includes("active")) return "in_progress";
      if (s.includes("cancel")) return "cancelled";
      if (s.includes("schedule")) return "scheduled";
      return "new";
    })(),
    address: row["service address"] || row["address"] || "",
    city: row["service city"] || row["city"] || "",
    state: row["service state"] || row["state"] || "",
    zip: row["service zip"] || row["zip"] || "",
    notes: row["notes"] || row["job notes"] || "",
    total_amount: parseFloat((row["total"] || row["amount"] || row["price"] || "0").replace(/[$,]/g, "")) || 0,
  };
}

const DATA_TYPES = [
  { value: "customers", label: "Customers", icon: Users, mapper: mapCustomer, entity: "Customer" },
  { value: "jobs", label: "Jobs", icon: Briefcase, mapper: mapJob, entity: "Job" },
  { value: "estimates", label: "Estimates", icon: FileText, mapper: mapEstimate, entity: "Estimate" },
  { value: "invoices", label: "Invoices", icon: FileText, mapper: mapInvoice, entity: "Invoice" },
];

export default function HouseCallProImport({ companies }) {
  const { toast } = useToast();
  const [selectedCompany, setSelectedCompany] = useState("");
  const [dataType, setDataType] = useState("customers");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      setPreview({ rows, raw: ev.target.result });
    };
    reader.readAsText(f);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  async function handleImport() {
    if (!selectedCompany || !preview) return;
    setImporting(true);
    const type = DATA_TYPES.find(t => t.value === dataType);
    const mapped = preview.rows.map(row => type.mapper(row, selectedCompany));

    let success = 0, failed = 0;
    // Import in batches of 20
    for (let i = 0; i < mapped.length; i += 20) {
      const batch = mapped.slice(i, i + 20);
      try {
        await base44.entities[type.entity].bulkCreate(batch);
        success += batch.length;
      } catch {
        failed += batch.length;
      }
    }

    setImporting(false);
    setResult({ success, failed, total: mapped.length });
    toast({ title: `Import complete: ${success} records imported${failed ? `, ${failed} failed` : ""}` });
  }

  const selectedType = DATA_TYPES.find(t => t.value === dataType);

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-4 py-4 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            Import from HouseCall Pro (CSV)
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">Export your data from HouseCall Pro and import it here. Supports Customers and Jobs.</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Step 1: Select company + type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Target Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Data Type</label>
              <Select value={dataType} onValueChange={v => { setDataType(v); clearFile(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 2: Upload file */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">CSV File</label>
            {!file ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-sm text-slate-500">Click to upload CSV</span>
                <span className="text-xs text-slate-400 mt-0.5">Exported from HouseCall Pro</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  {preview && <p className="text-xs text-slate-500">{preview.rows.length} rows detected</p>}
                </div>
                <button onClick={clearFile} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview && preview.rows.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">Preview (first 3 rows)</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Object.keys(preview.rows[0]).slice(0, 6).map(h => (
                        <th key={h} className="text-left text-slate-500 pr-4 pb-1 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 6).map((v, j) => (
                          <td key={j} className="text-slate-700 pr-4 py-0.5 truncate max-w-[100px]">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${result.failed === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
              {result.failed === 0
                ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              }
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {result.success} of {result.total} records imported successfully
                </p>
                {result.failed > 0 && <p className="text-xs text-amber-700">{result.failed} records failed to import</p>}
                {dataType === "jobs" && <p className="text-xs text-slate-500 mt-0.5">Note: Jobs will need customer IDs linked manually.</p>}
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!selectedCompany || !preview || importing}
            className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {importing ? (
              <>Importing {preview?.rows.length} {selectedType?.label}...</>
            ) : (
              <><Upload className="w-4 h-4" /> Import {preview ? `${preview.rows.length} ` : ""}{selectedType?.label}</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="border-0 shadow-sm bg-blue-50 border-blue-100">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">How to export from HouseCall Pro</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Log in to HouseCall Pro → go to <strong>Reports</strong> or <strong>Customers/Jobs</strong></li>
            <li>Click <strong>Export</strong> or <strong>Download CSV</strong></li>
            <li>Save the file to your computer</li>
            <li>Select the matching company and data type above, then upload the CSV</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}