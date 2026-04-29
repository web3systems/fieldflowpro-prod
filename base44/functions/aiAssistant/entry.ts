import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const JOB_SYSTEM_PROMPT = `You are an AI assistant helping a field service technician document job notes.
Your goal is to gather comprehensive information about what was done on a job site.

Ask follow-up questions to get specifics like:
- What problem was found?
- What work was performed?
- What materials/parts were used?
- How long did it take?
- Any issues or recommendations for the customer?

Keep questions short and conversational — one or two at a time.
When you have enough detail (usually after 2-4 exchanges), generate a final structured note.

When you have enough info, include in your JSON response a "result" object with:
{
  "note": "A professional, detailed job note summarizing all work performed..."
}

Always respond in JSON format:
{
  "reply": "your conversational message or question",
  "result": null OR { "note": "..." }
}`;

const ESTIMATE_SYSTEM_PROMPT = `You are an AI assistant helping a field service technician create a detailed estimate.
Your goal is to understand the scope of work and generate accurate line items.

Ask follow-up questions about:
- What type of work needs to be done?
- Measurements, square footage, or quantities?
- Materials needed (grade/quality)?
- Labor complexity and estimated hours?
- Any special requirements or access issues?
- Customer preferences or budget constraints?

Keep questions short — one topic at a time.
When you have enough info to build a solid estimate (usually after 3-5 exchanges), generate line items.

When ready, include a "result" object with line items:
{
  "line_items": [
    { "description": "Labor - ...", "quantity": 2, "unit_price": 85, "total": 170, "category": "labor" },
    { "description": "Material - ...", "quantity": 1, "unit_price": 45, "total": 45, "category": "materials" }
  ]
}

Always respond in JSON format:
{
  "reply": "your conversational message or question",
  "result": null OR { "line_items": [...] }
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode, context, messages, file_urls } = await req.json();

    const systemPrompt = mode === 'estimate' ? ESTIMATE_SYSTEM_PROMPT : JOB_SYSTEM_PROMPT;

    // Build context summary
    let contextSummary = '';
    if (mode === 'job_notes' && context?.job) {
      const j = context.job;
      contextSummary = `Job Context:
- Title: ${j.title || 'N/A'}
- Status: ${j.status || 'N/A'}
- Service Type: ${j.service_type || 'N/A'}
- Address: ${[j.address, j.city, j.state].filter(Boolean).join(', ') || 'N/A'}
- Customer: ${context.customer ? `${context.customer.first_name || ''} ${context.customer.last_name || ''}`.trim() : 'N/A'}
- Description: ${j.description || 'None'}`;
    } else if (mode === 'estimate' && context?.estimate) {
      const e = context.estimate;
      contextSummary = `Estimate Context:
- Title: ${e.title || 'N/A'}
- Customer: ${context.customer ? `${context.customer.first_name || ''} ${context.customer.last_name || ''}`.trim() : 'N/A'}
- Address: ${context.customer ? [context.customer.address, context.customer.city, context.customer.state].filter(Boolean).join(', ') : 'N/A'}`;
    }

    // Build conversation for LLM
    const conversationText = messages.map(m => `${m.role === 'user' ? 'Technician' : 'AI'}: ${m.content}`).join('\n');
    
    const prompt = `${systemPrompt}

${contextSummary}

Conversation so far:
${conversationText}

Respond with valid JSON only. No markdown, no code blocks.`;

    const hasImages = file_urls?.length > 0;

    let rawResponse;
    if (hasImages) {
      // Use gemini which supports both vision and structured output
      rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' },
            result: {
              type: 'object',
              properties: {
                note: { type: 'string' },
                line_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unit_price: { type: 'number' },
                      total: { type: 'number' },
                      category: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          required: ['reply']
        }
      });
    } else {
      rawResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' },
            result: {
              type: 'object',
              properties: {
                note: { type: 'string' },
                line_items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      quantity: { type: 'number' },
                      unit_price: { type: 'number' },
                      total: { type: 'number' },
                      category: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          required: ['reply']
        }
      });
    }

    return Response.json({ reply: rawResponse.reply, result: rawResponse.result || null });

  } catch (error) {
    console.error('aiAssistant error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});