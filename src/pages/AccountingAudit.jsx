import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "../Layout";
import AccountingLayout from "../components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Upload, Sparkles, AlertTriangle, CheckCircle,
  FileText, X, Send, User, Bot, RefreshCw, Info
} from "lucide-react";

export default function AccountingAudit() {
  const { activeCompany } = useApp();

  // Bank statement upload
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedBankData, setExtractedBankData] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef(null);

  // Audit results
  const [auditResults, setAuditResults] = useState(null);
  const [running, setRunning] = useState(false);

  // Chat
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello, I'm your CPA-trained forensic accountant. I specialize in financial reconciliation, discrepancy detection, and fraud analysis. Upload a bank statement and I'll compare it against your FieldFlow Pro records to identify any anomalies, unmatched transactions, or irregularities. You can also ask me questions about your finances at any time."
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setExtractedBankData(null);
    setAuditResults(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFile({ name: file.name, url: file_url, size: file.size });
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  }

  async function extractBankStatement() {
    if (!uploadedFile) return;
    setExtracting(true);
    try {
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: uploadedFile.url,
        json_schema: {
          type: "object",
          properties: {
            account_number: { type: "string" },
            bank_name: { type: "string" },
            statement_period_start: { type: "string" },
            statement_period_end: { type: "string" },
            opening_balance: { type: "number" },
            closing_balance: { type: "number" },
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" },
                  amount: { type: "number" },
                  type: { type: "string", description: "credit or debit" },
                  balance: { type: "number" }
                }
              }
            }
          }
        }
      });
      if (result.status === "success") {
        setExtractedBankData(result.output);
      }
    } catch (err) {
      console.error(err);
    }
    setExtracting(false);
  }

  async function runAudit() {
    if (!extractedBankData || !activeCompany) return;
    setRunning(true);
    setAuditResults(null);

    // Load internal data for comparison
    const [invoices, transactions, expenses] = await Promise.all([
      base44.entities.Invoice.filter({ company_id: activeCompany.id }),
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id }),
      base44.entities.AccountingTransaction.filter({ company_id: activeCompany.id, type: "expense" }),
    ]);

    const paidInvoices = invoices.filter(i => i.status === "paid");

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CPA-trained forensic accountant conducting a formal financial audit. Analyze the following data carefully and produce a detailed audit report.

BANK STATEMENT DATA:
${JSON.stringify(extractedBankData, null, 2)}

FIELDFLOW PRO INTERNAL RECORDS:
Paid Invoices (${paidInvoices.length} records):
${JSON.stringify(paidInvoices.slice(0, 100).map(i => ({
  invoice_number: i.invoice_number,
  total: i.total,
  paid_date: i.paid_date,
  status: i.status,
  customer_id: i.customer_id
})), null, 2)}

Accounting Transactions (${transactions.length} records):
${JSON.stringify(transactions.slice(0, 100).map(t => ({
  date: t.date,
  description: t.description,
  amount: t.amount,
  type: t.type,
  category: t.category,
  source: t.source
})), null, 2)}

Conduct a forensic audit and return a structured report with the following:
1. Reconciliation summary (totals match or discrepancy amount)
2. Unmatched bank credits (income in bank not in FieldFlow)
3. Unmatched bank debits (expenses in bank not in FieldFlow)
4. Suspicious or unusual transactions (round numbers, duplicate amounts, unusual descriptions)
5. Missing income (FieldFlow invoices not reflected in bank)
6. Overall risk rating: low, medium, or high
7. Specific action recommendations for each finding

Be extremely thorough and flag anything that could indicate bookkeeping errors, missing records, or potential fraud.`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_rating: { type: "string" },
            reconciliation_summary: { type: "string" },
            bank_total_credits: { type: "number" },
            bank_total_debits: { type: "number" },
            fieldflow_total_income: { type: "number" },
            fieldflow_total_expenses: { type: "number" },
            discrepancy_amount: { type: "number" },
            unmatched_bank_credits: {
              type: "array",
              items: { type: "object", properties: { date: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, concern: { type: "string" } } }
            },
            unmatched_bank_debits: {
              type: "array",
              items: { type: "object", properties: { date: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, concern: { type: "string" } } }
            },
            suspicious_transactions: {
              type: "array",
              items: { type: "object", properties: { date: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, reason: { type: "string" } } }
            },
            missing_income: {
              type: "array",
              items: { type: "object", properties: { invoice_number: { type: "string" }, amount: { type: "number" }, paid_date: { type: "string" }, issue: { type: "string" } } }
            },
            recommendations: { type: "array", items: { type: "string" } },
            overall_assessment: { type: "string" }
          }
        }
      });
      setAuditResults(res);
      // Push summary into chat
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ Audit complete. **Risk Rating: ${res.risk_rating?.toUpperCase()}**\n\n${res.overall_assessment}\n\nI found ${res.unmatched_bank_credits?.length || 0} unmatched credits, ${res.unmatched_bank_debits?.length || 0} unmatched debits, and ${res.suspicious_transactions?.length || 0} suspicious transactions. Ask me anything about these findings.`
      }]);
    } catch (err) {
      console.error(err);
    }
    setRunning(false);
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    // Build context for the AI
    const context = auditResults
      ? `Current audit results: ${JSON.stringify(auditResults)}`
      : extractedBankData
      ? `Bank statement uploaded (${extractedBankData.transactions?.length || 0} transactions). Audit not yet run.`
      : "No bank statement uploaded yet.";

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CPA-trained forensic accountant assistant for a field service business using FieldFlow Pro. You are helpful, precise, and professional. You speak clearly to business owners who may not be accounting experts.

Context: ${context}

Conversation so far:
${messages.map(m => `${m.role === "user" ? "User" : "Forensic Accountant"}: ${m.content}`).join("\n")}

User: ${userMsg}

Respond as the forensic accountant. Be specific, cite numbers when available, and give actionable advice. Keep responses concise but thorough.`,
        response_json_schema: { type: "object", properties: { reply: { type: "string" } } }
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.reply || "I couldn't generate a response. Please try again." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err?.message || "Unknown error. Please try again."}` }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  const riskColors = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <AccountingLayout companyId={activeCompany?.id}>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Forensic Audit</h1>
            <p className="text-slate-500 text-sm">CPA-trained AI compares your bank statements to FieldFlow Pro records</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left panel: upload + results */}
          <div className="lg:col-span-3 space-y-5">

            {/* Upload Card */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  Upload Bank Statement
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">Supports PDF, CSV, Excel, or image files. Your data is processed securely.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!uploadedFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl p-8 text-center transition-colors group"
                  >
                    <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600">Click to upload bank statement</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, CSV, XLS, PNG, JPG</p>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-slate-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={() => { setUploadedFile(null); setExtractedBankData(null); setAuditResults(null); }} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} />

                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading…
                  </div>
                )}

                {uploadedFile && !extractedBankData && (
                  <Button onClick={extractBankStatement} disabled={extracting} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                    {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {extracting ? "Reading Statement…" : "Read & Parse Statement"}
                  </Button>
                )}

                {extractedBankData && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-100 text-sm">
                      <p className="font-semibold text-green-700 flex items-center gap-1.5 mb-1"><CheckCircle className="w-3.5 h-3.5" /> Statement parsed successfully</p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                        {extractedBankData.bank_name && <span>Bank: {extractedBankData.bank_name}</span>}
                        {extractedBankData.statement_period_start && <span>Period: {extractedBankData.statement_period_start} – {extractedBankData.statement_period_end}</span>}
                        <span>Transactions: {extractedBankData.transactions?.length || 0}</span>
                        {extractedBankData.closing_balance != null && <span>Closing Balance: ${extractedBankData.closing_balance?.toLocaleString()}</span>}
                      </div>
                    </div>
                    <Button onClick={runAudit} disabled={running} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                      {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      {running ? "Running Forensic Audit…" : "Run Forensic Audit"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Results */}
            {auditResults && (
              <div className="space-y-4">
                {/* Risk Banner */}
                <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${riskColors[auditResults.risk_rating] || riskColors.medium}`}>
                  <ShieldCheck className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">Risk Rating: {auditResults.risk_rating?.toUpperCase()}</p>
                    <p className="text-xs mt-0.5">{auditResults.reconciliation_summary}</p>
                  </div>
                  {auditResults.discrepancy_amount != null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium">Discrepancy</p>
                      <p className="font-bold">${Math.abs(auditResults.discrepancy_amount || 0).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Comparison Table */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Reconciliation Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Bank Credits</p>
                        <p className="font-bold text-green-700">${(auditResults.bank_total_credits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">FieldFlow Income</p>
                        <p className="font-bold text-green-700">${(auditResults.fieldflow_total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Bank Debits</p>
                        <p className="font-bold text-red-600">${(auditResults.bank_total_debits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">FieldFlow Expenses</p>
                        <p className="font-bold text-red-600">${(auditResults.fieldflow_total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Findings Sections */}
                {auditResults.suspicious_transactions?.length > 0 && (
                  <FindingsCard title="Suspicious Transactions" icon={AlertTriangle} color="red" items={auditResults.suspicious_transactions} labelKey="reason" />
                )}
                {auditResults.unmatched_bank_credits?.length > 0 && (
                  <FindingsCard title="Unmatched Bank Credits" icon={Info} color="amber" items={auditResults.unmatched_bank_credits} labelKey="concern" />
                )}
                {auditResults.unmatched_bank_debits?.length > 0 && (
                  <FindingsCard title="Unmatched Bank Debits" icon={Info} color="amber" items={auditResults.unmatched_bank_debits} labelKey="concern" />
                )}
                {auditResults.missing_income?.length > 0 && (
                  <FindingsCard title="Missing Income (Invoices Not in Bank)" icon={AlertTriangle} color="red" items={auditResults.missing_income.map(m => ({ date: m.paid_date, description: `Invoice ${m.invoice_number}`, amount: m.amount, concern: m.issue }))} labelKey="concern" />
                )}

                {/* Recommendations */}
                {auditResults.recommendations?.length > 0 && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-500" /> Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {auditResults.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                            {r}
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right panel: Forensic Accountant Chat */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm flex flex-col h-full" style={{ minHeight: "500px" }}>
              <CardHeader className="pb-3 border-b border-slate-100 flex-shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Forensic Accountant AI</p>
                    <p className="text-xs text-slate-400 font-normal">CPA-trained · Always available</p>
                  </div>
                </CardTitle>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: "480px" }}>
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                    )}
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-slate-100 text-slate-800 rounded-tl-none"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="bg-slate-100 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-slate-100 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Ask about your finances…"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-slate-50"
                  />
                  <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} size="icon" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AccountingLayout>
  );
}

function FindingsCard({ title, icon: Icon, color, items, labelKey }) {
  const colorMap = {
    red: { bg: "bg-red-50", border: "border-red-100", text: "text-red-700", badge: "bg-red-100 text-red-700", icon: "text-red-500" },
    amber: { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", icon: "text-amber-500" },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex items-center gap-2 ${c.text}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
          {title}
          <Badge className={`ml-auto ${c.badge} border-0`}>{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className={`p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{item.description}</p>
                  {item.date && <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>}
                  {item[labelKey] && <p className={`text-xs mt-1 ${c.text}`}>{item[labelKey]}</p>}
                </div>
                {item.amount != null && (
                  <span className={`text-xs font-bold flex-shrink-0 ${c.text}`}>${Math.abs(item.amount).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}