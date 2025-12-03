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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl shadow-red-500/10">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
        >
          <Cross2Icon className="h-5 w-5" />
        </button>

        {/* Warning header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Delete Account</h2>
            <p className="text-sm text-slate-400">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning message */}
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">
            <strong>Warning:</strong> Deleting your account will permanently remove all your data, 
            including your profile and preferences. This action is irreversible.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Password confirmation form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Enter your password to confirm
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              disabled={isDeleting}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700 hover:bg-slate-900/60">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/20">
        <Icon className="h-5 w-5 text-brand" />
      </div>
      <h3 className="mb-1 font-medium text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
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
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Your Profile</h1>
        <p className="text-slate-400">Manage your account settings and preferences</p>
      </header>

      {/* User info card */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/20">
        <h2 className="mb-6 text-lg font-semibold text-white">Account Information</h2>
        
        <div className="space-y-4">
          {/* Username */}
          <div className="flex items-center gap-4 rounded-lg bg-slate-950/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20">
              <PersonIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
              <p className="text-white">{user.username}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-4 rounded-lg bg-slate-950/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
              <EnvelopeClosedIcon className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-4 rounded-lg bg-slate-950/50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
              <CalendarIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Member Since</p>
              <p className="text-white">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming soon section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/20">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
            <RocketIcon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Coming Soon</h2>
            <p className="text-sm text-slate-400">Exciting features we're working on</p>
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

        <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
          <p className="text-sm text-amber-200">
            We're constantly improving Open Search. Stay tuned for these awesome features!
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-500/30 bg-slate-900/60 p-6 shadow-xl shadow-red-500/5">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
            <p className="text-sm text-slate-400">Irreversible account actions</p>
          </div>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-medium text-white">Delete Account</h3>
              <p className="text-sm text-slate-400">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="whitespace-nowrap rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
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

