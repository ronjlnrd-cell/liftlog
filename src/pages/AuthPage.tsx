import { useState } from "react";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode() {
    if (!supabase || !email.trim()) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setSent(true);
    setMessage("Check your email for the 6-digit code.");
  }

  async function verifyCode() {
    if (!supabase || code.trim().length < 6) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  return (
    <main className="auth-shell">
      <section className="card auth-card">
        <div>
          <p className="eyebrow">LiftLog</p>
          <h1>{sent ? "Enter your code" : "Sign in"}</h1>
          <p>{sent ? `We sent a code to ${email}` : "Enter your email to continue. No password needed."}</p>
        </div>
        {!sent ? (
          <>
            <label>Email
              <input type="email" autoComplete="email" value={email}
                onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"
                onKeyDown={(e)=>{if(e.key==="Enter") void sendCode();}} />
            </label>
            <button className="primary large" disabled={busy || !email.trim()} onClick={()=>void sendCode()}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <>
            <label>6-digit code
              <input className="otp-input" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} value={code} onChange={(e)=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                onKeyDown={(e)=>{if(e.key==="Enter") void verifyCode();}} />
            </label>
            <button className="primary large" disabled={busy || code.length !== 6} onClick={()=>void verifyCode()}>
              {busy ? "Checking…" : "Continue"}
            </button>
            <button className="text-button" onClick={()=>{setSent(false);setCode("");setMessage("");}}>Use a different email</button>
          </>
        )}
        {message && <p className="auth-message">{message}</p>}
      </section>
    </main>
  );
}
