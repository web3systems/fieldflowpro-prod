import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SYSTEM_PROMPT = `You are an expert field-service pricing analyst. You review estimates in progress and flag two risks:
1. LOW BID — the total or line-item prices are noticeably below typical market rates for the described job type, which risks under-profit or under-charging.
2. MISSING TASKS — the estimate is missing standard tasks/line items that a complete job of this type should include (e.g. a fence job with no line for post setting/concrete, a painting job with no prep/cleanup line, an HVAC install with no disposal line).

You compare the estimate against typical market pricing and standard scopes for the trade. Use industry knowledge of common field-service trades (landscaping, handyman, plumbing, electrical, HVAC, painting, cleaning, roofing, fencing, remodeling).

Rules:
- Only flag REAL issues. If the estimate looks reasonable and complete, return no issues and should_alert=false.
- Be specific and actionable in suggestions (e.g. "Add a line for concrete/post setting — typically $X", "Labor at $45/hr is below the $65-85/hr typical for licensed electrical work").
- Keep messages concise (1-2 sentences each).
- Confidence is 0-1 (how sure you are the issue is real).

Respond with valid JSON only, no markdown:
{
  "should_alert": boolean,
  "issues": [
    { "type": "low_bid" | "missing_task", "message": "specific issue", "suggestion": "specific fix", "confidence": 0.0-1.0 }
  ],
  "summary": "one-line overall assessment"
}`;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try { user = await base44.auth.me(); } catch { user = null; }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch { /* empty */ }
    const { title, line_items, total, scope_of_work, service_type, company_industry } = body;

    // Need at least a title and some line items to review meaningfully
    if (!title || !Array.isArray(line_items) || line_items.length === 0) {
      return Response.json({ should_alert: false, issues: [], summary: 'Not enough detail to review yet.' });
    }

    const itemsSummary = line_items
      .map((i: any, idx: number) => `${idx + 1}. ${i.description || '(no description)'} | category: ${i.category || 'service'} | qty: ${i.quantity || 0} | unit_price: ${i.unit_price || 0} | total: ${i.total || 0}`)
      .join('\n');

    const prompt = `${SYSTEM_PROMPT}

Estimate to review:
- Title: ${title}
- Service type / job type: ${service_type || title}
- Trade / industry: ${company_industry || 'general field service'}
- Estimate total: $${Number(total || 0).toFixed(2)}
- Scope of work: ${(scope_of_work || '').replace(/<[^>]*>/g, '').slice(0, 800) || '(none provided)'}

Line items:
${itemsSummary}

Analyze this estimate. Flag low bids and missing standard tasks for this job type. If everything looks reasonable, return should_alert=false.`;

    const jsonSchema = {
      type: 'object',
      properties: {
        should_alert: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['low_bid', 'missing_task'] },
              message: { type: 'string' },
              suggestion: { type: 'string' },
              confidence: { type: 'number' }
            },
            required: ['type', 'message', 'suggestion']
          }
        },
        summary: { type: 'string' }
      },
      required: ['should_alert', 'issues', 'summary']
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: jsonSchema
    });

    return Response.json(result);
  } catch (error) {
    console.error('analyzeEstimateBid error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}