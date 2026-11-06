import { useEffect, useState } from 'react';

export default function CountdownTimer({ startTime, onResend, disabled = false }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - startTime) / 1000));
  const remaining = Math.max(0, 300 - elapsed);
  const resend = Math.max(0, 120 - elapsed);
  return <div className="dt-otp-help">
    <p role="timer" aria-live="off">{remaining ? `Code expires in ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Code expired. Request a new one.'}</p>
    {resend ? <p>Resend available in {resend}s</p> : <button type="button" disabled={disabled} onClick={onResend} className="dt-text-button">Resend code</button>}
  </div>;
}
