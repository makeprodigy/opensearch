import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api.js";

export default function Signup({ auth }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/signup", form);
      auth.login(response.data.token, response.data.user);
      navigate("/", { replace: true });
    } catch (signupError) {
      setError(signupError.response?.data?.message ?? "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-2xl border bg-white p-8 shadow-lg" style={{ borderColor: '#D4EAD8' }}>
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-600">
          Join Open Search to curate lists of repositories and request health refreshes.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-400 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Username
          </label>
          <input
            type="text"
            required
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ transition: 'all 0.2s ease' }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ transition: 'all 0.2s ease' }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Password
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{ transition: 'all 0.2s ease' }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            backgroundColor: '#2F7A4F',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#1F5A3A')}
          onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#2F7A4F')}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-xs text-gray-600 text-center">
        Already have an account?{" "}
        <Link 
          to="/login" 
          className="font-bold transition"
          style={{ color: '#2F7A4F', transition: 'color 0.2s ease' }}
          onMouseEnter={(e) => e.target.style.color = '#1F5A3A'}
          onMouseLeave={(e) => e.target.style.color = '#2F7A4F'}
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
