import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";

export const Login = () => {
  const { signInWithGoogle, signInWithEmail, user, error, initializing, isConfigured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      return;
    }
    setLoading(true);
    await signInWithEmail(email, password);
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
        <h2 className="text-2xl font-semibold text-slate-100">You're signed in</h2>
        <p className="text-sm text-slate-400">Continue to the dashboard to explore wallet analytics.</p>
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
        <h2 className="text-2xl font-semibold text-slate-100">Welcome back</h2>
        <p className="text-sm text-slate-400 mt-2">Sign in to sync watchlists and copy-trading controls.</p>
      </div>

      {!isConfigured ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Firebase is not configured. Add your Firebase client keys in `frontend/.env` to enable login.
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

      <form onSubmit={handleEmailLogin} className="grid gap-4">
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
        <Button type="submit" disabled={!isConfigured || loading || !email || !password}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <p className="text-sm text-slate-400">
        New here?{" "}
        <Link to="/signup" className="text-neon font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
};