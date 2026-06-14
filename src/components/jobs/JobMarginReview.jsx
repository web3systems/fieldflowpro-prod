import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldX, Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function JobMarginReview({ job, company, marginRule }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [expanded, setExpanded] = useState(true);

  async function runReview() {
    setLoading(true);
    setReviewed(false);
    setVerdict(null);

    const lineItemsSummary = (job.line_items || [])
      .map((li, i) => `  ${i + 1}. ${li.description || "(no description)"} | Qty: ${li.quantity} | Unit Price: $${li.unit_price} | Total: $${li.total} | Category: ${li.category || "unspecified"}`)
      .join("\n");

    const rulesSummary = marginRule
      ? `- Default min markup: ${marginRule.min_markup_pct ?? 30}%\n- Labor markup override: ${marginRule.labor_markup_pct != null ? marginRule.labor_markup_pct + "%" : "use default"}\n- Materials markup override: ${marginRule.materials_markup_pct != null ? marginRule.materials_markup_pct + "%" : "use default"}\n- Minimum total amount: $${marginRule.min_total_amount ?? 0}\n- Auto-approve enabled: ${marginRule.auto_approve ? "Yes" : "No"}`
      : "No specific rules configured — use industry standard margins (30% minimum markup).";

    const prompt = `Please review the following job's line items against our margin rules.\n\n**Job: ${job.title}**\n- Total: $${job.total_amount ?? 0}\n\n**Line Items:**\n${lineItemsSummary || "  (no line items)"}\n\n**Company Margin Rules:**\n${rulesSummary}\n\nPlease check each line item, give an overall PASS or FAIL verdict, and provide specific recommendations.`;

    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: "margin_review",
          metadata: { job_id: job.id, company_id: company?.id }
        });
        setConversation(conv);
      }

      const updated = await base44.agents.addMessage(conv, { role: "user", content: prompt });
      setMessages(updated.messages || []);

      const lastMsg = (updated.messages || []).filter(m => m.role === "assistant").pop();
      if (lastMsg?.content) {
        if (/\bPASS\b/i.test(lastMsg.content)) setVerdict("PASS");
        else if (/\bFAIL\b/i.test(lastMsg.content)) setVerdict("FAIL");
      }

      setReviewed(true);
    } finally {
      setLoading(false);
    }
  }

  async function rerun() {
    setConversation(null);
    setMessages([]);
    await runReview();
  }

  const lastAssistantMsg = messages.filter(m => m.role === "assistant").pop();

  const verdictColor = verdict === "PASS"
    ? "bg-green-100 text-green-700 border-green-200"
    : verdict === "FAIL"
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <Card className="border border-violet-200 shadow-sm">
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            Margin Review
            {verdict && (
              <Badge className={`text-xs border ${verdictColor}`}>
                {verdict}
              </Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {!reviewed && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">Check this job's margins against your company rules.</p>
              <Button onClick={runReview} className="gap-2 bg-violet-600 hover:bg-violet-700">
                <ShieldCheck className="w-4 h-4" /> Run Margin Review
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reviewing job margins...
            </div>
          )}

          {reviewed && lastAssistantMsg && (
            <div className="space-y-3">
              <div className={`rounded-lg border p-3 text-sm ${verdictColor}`}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {verdict === "PASS" ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                  {verdict === "PASS" ? "Margins look good" : "Margin issues found — review before proceeding"}
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50 rounded-lg p-3 text-sm leading-relaxed">
                <ReactMarkdown>{lastAssistantMsg.content}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={rerun} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}