import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertCircle, Zap, Send } from 'lucide-react';

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  open: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-blue-100 text-blue-800',
  waiting_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
};

export default function SupportTicketsTab() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [response, setResponse] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  async function loadTickets() {
    try {
      const query = filterStatus === 'all' ? {} : { status: filterStatus };
      const list = await base44.asServiceRole.entities.Ticket.filter(query);
      setTickets(list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (e) {
      console.error('Error loading tickets:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResponse() {
    if (!selectedTicket || !response.trim()) return;

    try {
      const newResponses = [
        ...(selectedTicket.responses || []),
        {
          sender_email: 'support@fieldflowpro.com',
          sender_name: 'Support Team',
          message: response,
          created_at: new Date().toISOString(),
          is_from_support: true
        }
      ];

      await base44.asServiceRole.entities.Ticket.update(selectedTicket.id, {
        responses: newResponses,
        status: 'in_progress'
      });

      setResponse('');
      setSelectedTicket({ ...selectedTicket, responses: newResponses, status: 'in_progress' });
      await loadTickets();
    } catch (e) {
      console.error('Error sending response:', e);
    }
  }

  async function handleUseAIResponse() {
    if (!selectedTicket?.ai_suggested_response) return;
    setResponse(selectedTicket.ai_suggested_response);
  }

  if (loading) return <div className="p-4">Loading tickets...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Ticket List */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_customer">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2">
            {tickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedTicket?.id === ticket.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ticket.subject}</p>
                    <p className="text-xs text-slate-500 truncate">{ticket.submitter_name}</p>
                  </div>
                  <Badge className={priorityColors[ticket.priority]} variant="outline">
                    {ticket.priority}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Ticket Detail */}
      <div className="lg:col-span-2">
        {selectedTicket ? (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{selectedTicket.subject}</CardTitle>
                  <CardDescription>From {selectedTicket.submitter_name}</CardDescription>
                </div>
                <Badge className={statusColors[selectedTicket.status]}>
                  {selectedTicket.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* Original Issue */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Issue</p>
                <p className="text-sm text-slate-700">{selectedTicket.description}</p>
              </div>

              {/* AI Suggestions */}
              {selectedTicket.ai_suggested_response && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">AI Suggestion</p>
                  </div>
                  <p className="text-sm text-blue-800">{selectedTicket.ai_suggested_response}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUseAIResponse}
                    className="mt-2"
                  >
                    Use this response
                  </Button>
                </div>
              )}

              {/* Conversation */}
              <div className="space-y-3">
                {selectedTicket.responses?.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      msg.is_from_support
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-slate-100'
                    }`}
                  >
                    <p className="font-medium text-xs mb-1">{msg.sender_name}</p>
                    <p className="text-slate-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>

            {/* Response Box */}
            <CardContent className="border-t pt-4 space-y-3">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response..."
                className="resize-none"
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={handleSendResponse} className="flex-1" disabled={!response.trim()}>
                  <Send className="w-4 h-4 mr-2" /> Send Response
                </Button>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(status) => {
                    base44.asServiceRole.entities.Ticket.update(selectedTicket.id, { status });
                    setSelectedTicket({ ...selectedTicket, status });
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_customer">Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-96">
            <p className="text-slate-500">Select a ticket to view details</p>
          </Card>
        )}
      </div>
    </div>
  );
}