import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ticket_id } = await req.json();
    if (!ticket_id) return Response.json({ error: 'Missing ticket_id' }, { status: 400 });

    const tickets = await base44.entities.Ticket.filter({ id: ticket_id });
    const ticket = tickets[0];
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    // Verify access
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      const access = await base44.asServiceRole.entities.UserCompanyAccess.filter({
        user_email: user.email,
        company_id: ticket.company_id
      });
      if (access.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call LLM to analyze ticket
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this support ticket and provide:
1. Suggested category (billing, technical, feature_request, account, other)
2. Suggested priority (low, medium, high, urgent)
3. Initial response suggestion (2-3 sentences)

Ticket:
Subject: ${ticket.subject}
Description: ${ticket.description}

Respond in JSON format:
{
  "category": "...",
  "priority": "...",
  "response": "..."
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          priority: { type: 'string' },
          response: { type: 'string' }
        }
      }
    });

    // Update ticket with AI suggestions
    await base44.entities.Ticket.update(ticket_id, {
      ai_category_suggestion: analysis.category,
      ai_priority_suggestion: analysis.priority,
      ai_suggested_response: analysis.response
    });

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('analyzeTicket error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});