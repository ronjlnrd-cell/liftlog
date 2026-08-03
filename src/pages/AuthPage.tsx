import { useState } from "react";
import { signInWithGoogle } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { APP_NAME } from "../shared";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function continueWithGoogle() {
    setBusy(true);
    setMessage("");
    const { error } = await signInWithGoogle();
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }

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
          <p className="eyebrow">{APP_NAME}</p>
          <h1>{sent ? "Enter your code" : "Sign in"}</h1>
          <p>{sent ? `We sent a code to ${email}` : "Enter your email to continue. No password needed."}</p>
        </div>
        {!sent ? (
          <>
            <button
              type="button"
              className="google-auth-button"
              disabled={busy}
              onClick={() => void continueWithGoogle()}
            >
              <span className="google-auth-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </span>
              {busy ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="auth-divider" aria-hidden="true">
              <span>or</span>
            </div>

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
