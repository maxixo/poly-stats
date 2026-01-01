import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export const Signup = () => {
  const { signInWithGoogle, signUpWithEmail, user, error, initializing, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleEmailSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }
    setLocalError("");
    setLoading(true);
    await signUpWithEmail(email, password);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  if (initializing) {
    return <p className="text-sm text-slate-400">Loading authentication...</p>;
  }

  if (user) {
    return (
      <div className="grid gap-4">
        <h2 className="text-2xl font-semibold text-slate-100">Account ready</h2>
        <p className="text-sm text-slate-400">You're signed in and ready to explore wallet analytics.</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full border border-neon/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon hover:bg-neon/10"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">Create your account</h2>
        <p className="text-sm text-slate-400 mt-2">Get personalized watchlists and copy trading controls.</p>
      </div>

      {!isConfigured ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Firebase is not configured. Add your Firebase client keys in `frontend/.env` to enable signup.
        </div>
      ) : null}

      <Button onClick={handleGoogle} disabled={!isConfigured || loading} variant="outline">
        {loading ? "Connecting..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-slate-500 uppercase tracking-[0.3em]">
        <span className="h-px flex-1 bg-white/10" />
        Or use email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleEmailSignup} className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
          />
        </div>
        <Button
          type="submit"
          disabled={!isConfigured || loading || !email || !password || !confirmPassword}
        >
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>

      {localError ? <p className="text-sm text-rose-400">{localError}</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <p className="text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-neon font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
};