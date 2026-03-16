import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STARTER_PROMPTS = [
  "What was my profit last month?",
  "Which expense categories are growing?",
  "Am I on track vs last quarter?",
  "What's my biggest cost driver?",
];

export default function AIInsightsPanel({ companyId, transactions, accounts }) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  async function ask(q) {
    const question = q || query;
    if (!question.trim()) return;
    setLoading(true);
    setResponse(null);

    const summary = {
      total_income: transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      total_expenses: transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      transaction_count: transactions.length,
      top_categories: Object.entries(
        transactions.reduce((acc, t) => {
          const cat = t.category || t.ai_category || "Uncategorized";
          acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]).slice(0, 5),
      recent_transactions: transactions.slice(0, 10).map(t => ({
        date: t.date, description: t.description, amount: t.amount, type: t.type, category: t.category
      })),
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert accountant and financial advisor for a field service business. 
Here is the company's financial summary:
- Total Income: $${summary.total_income.toFixed(2)}
- Total Expenses: $${summary.total_expenses.toFixed(2)}
- Net Profit: $${(summary.total_income - summary.total_expenses).toFixed(2)}
- Transaction count: ${summary.transaction_count}
- Top categories by spend: ${summary.top_categories.map(([k, v]) => `${k}: $${v.toFixed(2)}`).join(", ")}
- Recent transactions: ${JSON.stringify(summary.recent_transactions)}

The user asks: "${question}"

Respond concisely, like a trusted advisor. Use plain language. Include specific numbers where helpful. Keep it under 150 words.`,
    });

    setResponse(result);
    setLoading(false);
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-900">AI Financial Advisor</h3>
      </div>

      {response && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-100 text-sm text-slate-700 leading-relaxed">
          {response}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {STARTER_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => ask(p)}
            className="text-xs px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Ask anything about your finances..."
          className="text-sm bg-white"
        />
        <Button size="sm" onClick={() => ask()} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}