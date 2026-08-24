import { useState } from "react";
import { signIn, signUp, signInWithGoogle } from "../lib/auth";

// ---------- sign in / sign up ----------
export default function AuthScreen({ onBack, message }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const submitGoogle = async () => {
    setError(null);
    setGoogleBusy(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err.message || "Couldn't start Google sign-in.");
      setGoogleBusy(false);
    }
    // On success the browser redirects away to Google, then back — no
    // further local state to set here.
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await signUp(email.trim(), password);
        if (err) throw err;
        if (!data.session) {
          // Email confirmation is on for this project — no session yet.
          setCheckEmail(true);
        }
      } else {
        const { error: err } = await signIn(email.trim(), password);
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="pn-auth-shell">
        <div className="pn-auth-box">
          <div className="pn-masthead-mark" style={{ marginBottom: 18 }}>PACENOTES</div>
          <div className="pn-empty-hero-title">Check your email</div>
          <div className="pn-hint" style={{ marginTop: 8 }}>
            We sent a confirmation link to <span className="pn-mono">{email}</span>. Follow it, then come back and sign in.
          </div>
          <button className="pn-btn pn-btn-ghost pn-btn-full" style={{ marginTop: 18 }} onClick={() => { setCheckEmail(false); setMode("signin"); }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pn-auth-shell">
      <div className="pn-auth-box">
        {onBack && <button className="pn-auth-back" onClick={onBack}>‹ Continue browsing</button>}
        <div className="pn-masthead-mark" style={{ marginBottom: 4 }}>PACENOTES</div>
        <div className="pn-masthead-tag" style={{ marginBottom: 22 }}>{message || "Route notes and a live split timer, for any game."}</div>

        <button className="pn-google-btn" onClick={submitGoogle} disabled={googleBusy} type="button">
          <svg className="pn-google-icon" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          <span>{googleBusy ? "Signing in…" : "Sign in with Google"}</span>
        </button>
        <div className="pn-auth-divider"><span>or</span></div>

        <form onSubmit={submit}>
          <label className="pn-label" style={{ marginTop: 0 }}>Email</label>
          <input
            className="pn-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="pn-label">Password</label>
          <input
            className="pn-input"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "at least 6 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="pn-auth-error">{error}</div>}

          <button className="pn-btn pn-btn-primary pn-btn-full" style={{ marginTop: 16 }} disabled={busy || !email.trim() || !password} type="submit">
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          className="pn-auth-switch"
          onClick={() => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(null); }}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
