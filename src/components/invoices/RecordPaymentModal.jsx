import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, CheckCircle } from "lucide-react";

const PAYMENT_METHODS = ["cash", "check", "bank_transfer", "venmo", "zelle", "other"];

export default function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const amountDue = (invoice.total || 0) - (invoice.amount_paid || 0);
  const [amount, setAmount] = useState(amountDue.toFixed(2));
  const [method, setMethod] = useState("cash");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const paid = parseFloat(amount) || 0;
    const newAmountPaid = (invoice.amount_paid || 0) + paid;
    const newStatus = newAmountPaid >= (invoice.total || 0) ? "paid" : "partial";
    await base44.entities.Invoice.update(invoice.id, {
      amount_paid: newAmountPaid,
      status: newStatus,
      paid_date: newStatus === "paid" ? paidDate : invoice.paid_date,
      payment_method: method,
      notes: note ? `${invoice.notes || ""}\n[Payment ${paidDate}]: ${note}`.trim() : invoice.notes,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold text-slate-800">Record Payment</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice total</span>
              <span className="font-medium">${(invoice.total || 0).toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Already paid</span>
                <span className="text-green-600">${(invoice.amount_paid || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
              <span>Amount due</span>
              <span className="text-red-600">${amountDue.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Payment Amount ($)</Label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mt-1"
              step="0.01"
              min="0"
              max={amountDue}
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1 capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Date Received</Label>
            <Input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Note (optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Check #1234" className="mt-1" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !amount || parseFloat(amount) <= 0} className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4" />
              {saving ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}