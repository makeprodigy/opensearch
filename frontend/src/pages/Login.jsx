import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "../services/api.js";

export default function Login({ auth }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/login", form);
      auth.login(response.data.token, response.data.user);
      const redirect = location.state?.from?.pathname ?? "/";
      navigate(redirect, { replace: true });
    } catch (loginError) {
      setError(loginError.response?.data?.message ?? "Failed to log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/20">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">Log in to queue refreshes and save favourite repos.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Password
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-xs text-slate-400">
        New here?{" "}
        <Link to="/signup" className="text-brand hover:text-brand-dark">
          Create an account
        </Link>
      </p>
    </div>
  );
}

