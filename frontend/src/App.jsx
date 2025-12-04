/**
 * Main application component with routing and authentication.
 * 
 * This component:
 * - Sets up React Router for client-side routing
 * - Manages authentication state (JWT tokens, user data)
 * - Provides auth context to child components
 * - Renders navigation header and footer
 * 
 * Routes:
 *   - / - Home page (search and results)
 *   - /repos/:owner/:repo - Repository details page
 *   - /login - Login page
 *   - /signup - Signup page
 *   - /profile - User profile page (protected)
 *   - /dashboard - Protected route (redirects to login if not authenticated)
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { jwtDecode } from "jwt-decode";

import Home from "./pages/Home.jsx";
import RepoDetails from "./pages/RepoDetails.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import UserProfile from "./pages/UserProfile.jsx";

/**
 * Custom hook for managing authentication state.
 * 
 * Handles:
 * - Token storage/retrieval from localStorage
 * - Token expiration validation
 * - User data persistence
 * - Login/logout operations
 * 
 * @returns {Object} Auth state and methods: { token, user, login, logout }
 */
function useAuth() {
  // Initialize token from localStorage
  const [token, setToken] = useState(localStorage.getItem("token"));
  // Initialize user from localStorage (lazy initialization)
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // Validate token on mount and when token changes
  useEffect(() => {
    if (!token) {
      // No token - clear user data
      setUser(null);
      localStorage.removeItem("user");
      return;
    }
    try {
      // Decode and validate token expiration
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      // If user not in state but token is valid, restore from localStorage
      if (!user) {
        const stored = localStorage.getItem("user");
        if (stored) {
          setUser(JSON.parse(stored));
        }
      }
    } catch (error) {
      // Token invalid or expired - clear all auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  }, [token, user]);

  // Return memoized auth object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      token,
      user,
      // Login: store token and user data in localStorage and state
      login(nextToken, nextUser) {
        localStorage.setItem("token", nextToken);
        localStorage.setItem("user", JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
      },
      // Logout: clear all auth data
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

/**
 * Protected route wrapper component.
 * 
 * Redirects to login page if user is not authenticated.
 * Preserves the intended destination in location state for redirect after login.
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Child components to render if authenticated
 * @param {boolean} props.isAuthenticated - Whether user is authenticated
 */
function ProtectedRoute({ children, isAuthenticated }) {
  const location = useLocation();
  if (!isAuthenticated) {
    // Redirect to login, preserving intended destination
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

/**
 * Main App component - root of the application.
 * 
 * Renders:
 * - Header with navigation and auth controls
 * - Main content area with routes
 * - Footer
 */
export default function App() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-gray-900">
      {/* Application header with logo and navigation */}
      <header className="border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {/* Logo linking to home */}
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <GitHubLogoIcon className="h-6 w-6" style={{ color: '#2F7A4F' }} />
            <span style={{ color: '#2F7A4F' }}>GoodFirstFinder</span>
          </Link>
          {/* Navigation: show user info if logged in, login/signup if not */}
          <nav className="flex items-center gap-3 text-sm">
            {auth.user ? (
              <>
                {/* User badge - clickable, links to profile */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs uppercase tracking-wide text-gray-900 font-medium transition hover:bg-emerald-100"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#2F7A4F' }}>
                    {auth.user.username.charAt(0).toUpperCase()}
                  </span>
                  {auth.user.username}
                </Link>
                {/* Logout button */}
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1 font-medium text-gray-900 transition hover:bg-gray-50 hover:border-gray-400"
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
                {/* Login link */}
                <Link to="/login" className="text-gray-900 font-medium transition" style={{ color: '#2F7A4F' }} onMouseEnter={(e) => e.target.style.color = '#1F5A3A'} onMouseLeave={(e) => e.target.style.color = '#2F7A4F'}>
                  Log in
                </Link>
                {/* Signup button */}
                <Link
                  to="/signup"
                  className="rounded-lg px-4 py-2 font-semibold text-white transition shadow-sm"
                  style={{ backgroundColor: '#2F7A4F' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1F5A3A'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2F7A4F'}
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main content area with routes */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/repos/:owner/:repo" element={<RepoDetails auth={auth} />} />
          <Route path="/login" element={<Login auth={auth} />} />
          <Route path="/signup" element={<Signup auth={auth} />} />
          {/* Protected routes - require authentication */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthenticated={Boolean(auth.user)}>
                <UserProfile auth={auth} />
              </ProtectedRoute>
            }
          />
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

      {/* Application footer */}
      <footer className="border-t border-gray-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-xs text-gray-600">
          <span>&copy; {new Date().getFullYear()} GoodFirstFinder</span>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="transition"
            style={{ color: '#2F7A4F' }}
            onMouseEnter={(e) => e.target.style.color = '#1F5A3A'}
            onMouseLeave={(e) => e.target.style.color = '#2F7A4F'}
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
