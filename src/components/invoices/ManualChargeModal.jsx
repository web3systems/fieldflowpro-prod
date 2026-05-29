import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function ChargeForm({ invoice, amountDue, onSuccess, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState(amountDue.toFixed(2));
  const [sendReceipt, setSendReceipt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);

    const chargeAmount = parseFloat(amount);
    if (!chargeAmount || chargeAmount <= 0) {
      setError("Please enter a valid amount.");
      setLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (pmError) {
      setError(pmError.message);
      setLoading(false);
      return;
    }

    try {
      const res = await base44.functions.invoke("manualChargeCard", {
        invoice_id: invoice.id,
        amount: chargeAmount,
        payment_method_id: paymentMethod.id,
        send_receipt: sendReceipt,
      });

      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => onSuccess(res.data), 1500);
      } else {
        setError(res.data?.error || "Charge failed. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Charge failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-lg font-semibold text-slate-800">Payment Successful!</p>
        <p className="text-sm text-slate-500">Charged ${parseFloat(amount).toFixed(2)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-slate-700">Amount to Charge ($)</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="mt-1"
          placeholder="0.00"
        />
        <p className="text-xs text-slate-400 mt-1">
          Balance due: <strong>${amountDue.toFixed(2)}</strong> · Invoice total: <strong>${(invoice.total || 0).toFixed(2)}</strong>
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium text-slate-700 block mb-2">Card Details</Label>
        <div className="border border-slate-300 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "15px",
                  color: "#1e293b",
                  fontFamily: "system-ui, sans-serif",
                  "::placeholder": { color: "#94a3b8" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={sendReceipt}
          onChange={e => setSendReceipt(e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-slate-600">Send receipt email to customer</span>
      </label>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
          disabled={loading || !stripe}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
          {loading ? "Processing..." : `Charge $${parseFloat(amount || 0).toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

export default function ManualChargeModal({ invoice, amountDue, onSuccess, onClose }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [keyError, setKeyError] = useState(null);

  useEffect(() => {
    base44.functions.invoke("getStripePublishableKey", {})
      .then(res => {
        const key = res.data?.publishable_key;
        if (key) setStripePromise(loadStripe(key));
        else setKeyError("Stripe is not configured.");
      })
      .catch(() => setKeyError("Could not load Stripe configuration."));
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Charge Card Manually</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {keyError ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            {keyError}
          </div>
        ) : !stripePromise ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <Elements stripe={stripePromise}>
            <ChargeForm
              invoice={invoice}
              amountDue={amountDue}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}