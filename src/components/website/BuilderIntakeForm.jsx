import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { builderError } from '@/components/website/builderClient';
export default function BuilderIntakeForm({ routeKey, blockId, booking, preview }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false);
  const started = useRef(Date.now()), challenge = useRef(null);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (!challenge.current) { const r = await base44.functions.invoke('websiteIntake', { action: 'challenge', route_key: routeKey }); if (r.data.error) throw new Error(r.data.error); challenge.current = r.data.challenge; }
      const r = await base44.functions.invoke('websiteIntake', { action: 'submit', route_key: routeKey, block_id: blockId, challenge: challenge.current, started_at: started.current, ...fields });
      if (r.data.error) throw new Error(r.data.error); setDone(true);
    } catch (e) { setError(builderError(e)); } finally { setBusy(false); }
  }
  if (done) return <p role="status">Your request was received. An appointment is not confirmed until the business contacts you.</p>;
  return <form onSubmit={submit}>
    <p>{preview ? 'Preview only — submissions are disabled.' : booking ? 'Request an appointment; this is not confirmed availability.' : 'Contact this business or request a quote.'}</p>
    <fieldset disabled={preview || busy}>
      {[['first_name', 'First name', 'text'], ['last_name', 'Last name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone (optional)', 'tel'], ['service', 'Service / enquiry', 'text']].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type} maxLength={name === 'service' ? 160 : 120} required={name !== 'phone'} /></label>)}
      {booking && <label>Preferred date (request only)<input name="preferred_date" type="date" required min={new Date().toISOString().slice(0, 10)} /></label>}
      <label>Message<textarea name="message" maxLength={2000} required /></label>
      <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <label><input name="consent" type="checkbox" value="yes" required style={{ width: 'auto' }} /> I agree to be contacted about this request.</label>
      <button type="submit">{busy ? 'Sending…' : booking ? 'Request appointment' : 'Send request'}</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}