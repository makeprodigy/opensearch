/**
 * User Profile page component.
 * 
 * This component displays:
 * - User account information
 * - Coming soon features section
 * - Danger zone with account deletion functionality
 * 
 * Account deletion requires password confirmation and shows a
 * confirmation modal before proceeding.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  PersonIcon, 
  EnvelopeClosedIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  RocketIcon,
  BookmarkIcon,
  BellIcon,
  BarChartIcon,
  Cross2Icon
} from "@radix-ui/react-icons";

import api from "../services/api.js";

/**
 * Formats a date string to a readable format.
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Delete Account Modal component.
 * Shows a confirmation dialog with password verification.
 */
function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting, error }) {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm(password);
  }

  function handleClose() {
    setPassword("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-300 bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <Cross2Icon className="h-5 w-5" />
        </button>

        {/* Warning header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Delete Account</h2>
            <p className="text-sm text-text-secondary">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning message */}
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            <strong>Warning:</strong> Deleting your account will permanently remove all your data, 
            including your profile and preferences. This action is irreversible.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-400 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Password confirmation form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Enter your password to confirm
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              disabled={isDeleting}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting || !password}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Coming Soon Feature Card component.
 */
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl border border-brand-light bg-white p-4 shadow-sm transition hover:border-brand hover:shadow-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <h3 className="mb-1 font-medium text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </div>
  );
}

/**
 * Main UserProfile component.
 */
export default function UserProfile({ auth }) {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const { user } = auth;

  // Redirect if not authenticated
  if (!user) {
    navigate("/login");
    return null;
  }

  async function handleDeleteAccount(password) {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.delete("/auth/account", {
        data: { password },
      });
      
      // Logout and redirect to home
      auth.logout();
      navigate("/", { replace: true });
    } catch (error) {
      setDeleteError(error.response?.data?.message ?? "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Page header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Your Profile</h1>
        <p className="text-text-secondary">Manage your account settings and preferences</p>
      </header>

      {/* User info card */}
      <section className="rounded-2xl border border-brand-light bg-white p-6 shadow-card">
        <h2 className="mb-6 text-lg font-semibold text-text-primary">Account Information</h2>
        
        <div className="space-y-4">
          {/* Username */}
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-muted">
              <PersonIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Username</p>
              <p className="text-text-primary">{user.username}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <EnvelopeClosedIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Email</p>
              <p className="text-text-primary">{user.email}</p>
            </div>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Member Since</p>
              <p className="text-text-primary">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming soon section */}
      <section className="rounded-2xl border border-brand-light bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
            <RocketIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Coming Soon</h2>
            <p className="text-sm text-text-secondary">Exciting features we're working on</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={BookmarkIcon}
            title="Saved Repositories"
            description="Bookmark your favorite repos and access them quickly from your profile."
          />
          <FeatureCard
            icon={BellIcon}
            title="Activity Notifications"
            description="Get notified when your saved repos have new good first issues."
          />
          <FeatureCard
            icon={BarChartIcon}
            title="Contribution Insights"
            description="Track your open source contributions and see your impact."
          />
          <FeatureCard
            icon={PersonIcon}
            title="Profile Customization"
            description="Add your bio, skills, and interests to personalize your profile."
          />
        </div>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-800">
            We're constantly improving Open Search. Stay tuned for these awesome features!
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-300 bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Danger Zone</h2>
            <p className="text-sm text-text-secondary">Irreversible account actions</p>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-text-primary">Delete Account</h3>
              <p className="text-sm text-text-secondary">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="whitespace-nowrap rounded-lg border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Delete confirmation modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteError(null);
        }}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
