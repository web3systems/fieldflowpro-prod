import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldX, Loader2, ChevronDown, ChevronUp, Send, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function EstimateMarginReview({ estimate, company, onApprovedForSending }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [verdict, setVerdict] = useState(null); // "PASS" | "FAIL" | null
  const [expanded, setExpanded] = useState(true);
  const [marginRule, setMarginRule] = useState(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (company?.id) {
      base44.entities.MarginRule.filter({ company_id: company.id })
        .then(rules => setMarginRule(rules[0] || null))
        .catch(() => {});
    }
  }, [company?.id]);

  async function runReview() {
    setLoading(true);
    setReviewed(false);
    setVerdict(null);

    // Build a rich prompt with all the estimate data
    const lineItemsSummary = (estimate.options?.[0]?.line_items || estimate.line_items || [])
      .map((li, i) => `  ${i + 1}. ${li.description || "(no description)"} | Qty: ${li.quantity} | Unit Price: $${li.unit_price} | Total: $${li.total} | Category: ${li.category || "unspecified"}`)
      .join("\n");

    const rulesSummary = marginRule
      ? `- Default min markup: ${marginRule.min_markup_pct ?? 30}%\n- Labor markup override: ${marginRule.labor_markup_pct != null ? marginRule.labor_markup_pct + "%" : "use default"}\n- Materials markup override: ${marginRule.materials_markup_pct != null ? marginRule.materials_markup_pct + "%" : "use default"}\n- Minimum total amount: $${marginRule.min_total_amount ?? 0}\n- Auto-approve enabled: ${marginRule.auto_approve ? "Yes" : "No"}`
      : "No specific rules configured — use industry standard margins (30% minimum markup).";

    const opt = estimate.options?.[0] || estimate;
    const prompt = `Please review the following estimate against our margin rules.\n\n**Estimate: ${estimate.title}** (${estimate.estimate_number || "no number"})\n- Subtotal: $${opt.subtotal ?? estimate.subtotal ?? 0}\n- Tax: $${opt.tax_amount ?? estimate.tax_amount ?? 0}\n- Total: $${opt.total ?? estimate.total ?? 0}\n\n**Line Items:**\n${lineItemsSummary || "  (no line items)"}\n\n**Company Margin Rules:**\n${rulesSummary}\n\nPlease check each line item, give an overall PASS or FAIL verdict, and provide specific recommendations.`;

    try {
      let conv = conversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: "margin_review",
          metadata: { estimate_id: estimate.id, company_id: company?.id }
        });
        setConversation(conv);
      }

      const updated = await base44.agents.addMessage(conv, { role: "user", content: prompt });
      setMessages(updated.messages || []);

      // Detect verdict from last assistant message
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

  const canApprove = reviewed && verdict === "PASS";
  const autoApprove = marginRule?.auto_approve;

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
            {autoApprove && (
              <Badge className="text-xs bg-blue-100 text-blue-600 border border-blue-200">Auto-approve ON</Badge>
            )}
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {!reviewed && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">Run a margin check before sending this estimate to the customer.</p>
              <Button onClick={runReview} className="gap-2 bg-violet-600 hover:bg-violet-700">
                <ShieldCheck className="w-4 h-4" /> Run Margin Review
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reviewing estimate margins...
            </div>
          )}

          {reviewed && lastAssistantMsg && (
            <div className="space-y-3">
              <div className={`rounded-lg border p-3 text-sm ${verdictColor}`}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {verdict === "PASS" ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                  {verdict === "PASS" ? "Margins look good — ready to send" : "Margin issues found — review before sending"}
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 bg-slate-50 rounded-lg p-3 text-sm leading-relaxed">
                <ReactMarkdown>{lastAssistantMsg.content}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={rerun} className="gap-1 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-run
                </Button>
                {(canApprove || (autoApprove && reviewed)) && (
                  <Button
                    size="sm"
                    onClick={onApprovedForSending}
                    className="gap-1 text-xs bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve for Sending
                  </Button>
                )}
                {reviewed && verdict === "FAIL" && !autoApprove && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onApprovedForSending}
                    className="gap-1 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Override & Send Anyway
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}