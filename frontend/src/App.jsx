import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { jwtDecode } from "jwt-decode";

import Home from "./pages/Home.jsx";
import RepoDetails from "./pages/RepoDetails.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem("user");
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      if (!user) {
        const stored = localStorage.getItem("user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      }
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  }, [token, user]);

  return useMemo(
    () => ({
      token,
      user,
      login(nextToken, nextUser) {
        localStorage.setItem("token", nextToken);
        localStorage.setItem("user", JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
      },
      logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
      },
    }),
    [token, user],
  );
}

function ProtectedRoute({ children, isAuthenticated }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-brand">
            <GitHubLogoIcon className="h-6 w-6" />
            <span>Open Search</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {auth.user ? (
              <>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                  {auth.user.username}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-slate-800 px-3 py-1 font-medium text-slate-200 transition hover:bg-slate-700"
                  onClick={() => {
                    auth.logout();
                    navigate("/");
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-slate-100">
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-brand-dark"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/repos/:owner/:repo" element={<RepoDetails auth={auth} />} />
          <Route path="/login" element={<Login auth={auth} />} />
          <Route path="/signup" element={<Signup auth={auth} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthenticated={Boolean(auth.user)}>
                <Home />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Open Search</span>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-300"
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

