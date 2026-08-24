import { useState } from "react";
import { signIn, signUp, signInWithGoogle } from "../lib/auth";

// ---------- sign in / sign up ----------
export default function AuthScreen() {
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
          <div className="pn-masthead-mark" style={{ marginBottom: 18 }}>PACE NOTES</div>
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
        <div className="pn-masthead-mark" style={{ marginBottom: 4 }}>PACE NOTES</div>
        <div className="pn-masthead-tag" style={{ marginBottom: 22 }}>Route notes and a live split timer, for any game.</div>

        <button className="pn-btn pn-btn-ghost pn-btn-full pn-auth-google" onClick={submitGoogle} disabled={googleBusy} type="button">
          {googleBusy ? "…" : "Continue with Google"}
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
