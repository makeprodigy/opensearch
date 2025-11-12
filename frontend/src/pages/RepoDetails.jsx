import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { GitHubLogoIcon, ReloadIcon } from "@radix-ui/react-icons";

import api from "../services/api.js";

function HealthScoreBadge({ score }) {
  // More encouraging color scheme with green for good scores
  let badgeClasses = "";
  let label = "";
  
  if (score >= 80) {
    // Excellent - Bright green
    badgeClasses = "border-emerald-400/50 bg-emerald-500/20 text-emerald-300";
    label = "Excellent";
  } else if (score >= 65) {
    // Great - Medium green
    badgeClasses = "border-green-400/50 bg-green-500/20 text-green-300";
    label = "Great";
  } else if (score >= 50) {
    // Good - Light green
    badgeClasses = "border-lime-400/50 bg-lime-500/20 text-lime-300";
    label = "Good";
  } else if (score >= 35) {
    // Fair - Blue/teal (neutral, not demoralizing)
    badgeClasses = "border-cyan-400/50 bg-cyan-500/20 text-cyan-300";
    label = "Fair";
  } else {
    // Developing - Soft blue (encouraging, not red)
    badgeClasses = "border-blue-400/50 bg-blue-500/20 text-blue-300";
    label = "Developing";
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold ${badgeClasses}`}>
      <span className="text-lg">{score}</span>
      <span className="text-xs opacity-80">/ 100 · {label}</span>
    </div>
  );
}

export default function RepoDetails({ auth }) {
  const { owner, repo } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/search/${owner}/${repo}`);
        const health = await api.get(`/repos/${response.data.id}/health`);
        console.log('Health API response:', health.data);
        setData({
          ...response.data,
          health: health.data,
        });
      } catch (loadError) {
        setError(loadError.message ?? "Failed to load repository");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [owner, repo]);

  // Auto-poll for updates if activity data is missing
  useEffect(() => {
    if (!data || loading) return;
    
    const hasActivityData = data.health?.activity && data.health?.refreshedAt;
    if (hasActivityData) {
      console.log('Activity data already available, no polling needed');
      return;
    }

    console.log('Starting to poll for activity data...', { repoId: data.id });
    
    let pollInterval;
    let timeout;
    let mounted = true;

    const checkForData = async () => {
      if (!mounted) return;
      
      try {
        const health = await api.get(`/repos/${data.id}/health`);
        console.log('Polling health data:', health.data);
        
        // Check if we have activity data with actual values
        const hasActivity = health.data?.activity && 
                          health.data?.refreshedAt &&
                          (health.data.activity.prsOpened !== undefined ||
                           health.data.activity.prsMerged !== undefined ||
                           health.data.activity.issuesOpened !== undefined);
        
        if (hasActivity && mounted) {
          console.log('✅ Activity data received! Updating UI...');
          
          setData(prev => ({
            ...prev,
            health: health.data,
          }));
          
          // Clean up polling
          if (pollInterval) clearInterval(pollInterval);
          if (timeout) clearTimeout(timeout);
        }
      } catch (pollError) {
        console.error('Polling error:', pollError);
      }
    };

    // Start polling every 5 seconds
    pollInterval = setInterval(checkForData, 5000);

    // Stop polling after 2 minutes
    timeout = setTimeout(() => {
      console.log('⏱️ Polling timeout reached (2 minutes)');
      if (pollInterval) clearInterval(pollInterval);
    }, 120000);

    // Cleanup
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (timeout) clearTimeout(timeout);
    };
  }, [data?.id, data?.health?.activity, data?.health?.refreshedAt, loading]);

  async function refreshHealth() {
    if (!data) return;
    try {
      await api.post(`/repos/${data.id}/refresh`);
      // Clear activity data to trigger polling
      setData(prev => ({
        ...prev,
        health: {
          ...prev.health,
          activity: null,
          refreshedAt: null,
        },
      }));
      alert('Health refresh queued! Activity data will update automatically in ~15-30 seconds.');
    } catch (refreshError) {
      setError(refreshError.message ?? "Failed to queue refresh");
    }
  }

  async function reloadData() {
    if (!data) return;
    setLoading(true);
    try {
      const response = await api.get(`/search/${owner}/${repo}`);
      const health = await api.get(`/repos/${response.data.id}/health`);
      setData({
        ...response.data,
        health: health.data,
      });
    } catch (loadError) {
      setError(loadError.message ?? "Failed to reload repository");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400">
        Loading repository details…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
        {error ?? "Repository not found"}
      </div>
    );
  }

  // Check if activity data has been fetched
  // Activity is considered loaded if we have refreshedAt timestamp AND activity data with values
  const hasActivityData = data?.health?.activity && 
                          data?.health?.refreshedAt &&
                          (data.health.activity.prsOpened !== undefined ||
                           data.health.activity.prsMerged !== undefined ||
                           data.health.activity.issuesOpened !== undefined);
  const isLoadingActivity = !hasActivityData;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/20">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            {isLoadingActivity ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                <ReloadIcon className="h-3 w-3 animate-spin" />
                Calculating health score...
              </div>
            ) : (
              <HealthScoreBadge score={data.health?.healthScore ?? 0} />
            )}
            <h1 className="text-3xl font-bold text-white">{data.fullName}</h1>
            <p className="max-w-2xl text-sm text-slate-400">{data.description}</p>
            <a
              href={`https://github.com/${data.fullName}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-brand hover:text-white"
            >
              <GitHubLogoIcon className="h-4 w-4" />
              View on GitHub
            </a>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reloadData}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-brand hover:text-white"
            >
              <ReloadIcon className="h-4 w-4" />
              Reload Data
            </button>
            {auth?.user && (
              <button
                type="button"
                onClick={refreshHealth}
                className="inline-flex items-center gap-2 self-start rounded-lg bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-dark"
              >
                <ReloadIcon className="h-4 w-4" />
                Queue Health Refresh
              </button>
            )}
          </div>
        </div>

        <dl className="mt-8 grid gap-6 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Stars</dt>
            <dd className="text-lg font-semibold">{data.stars?.toLocaleString() ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Forks</dt>
            <dd className="text-lg font-semibold">{data.forks?.toLocaleString() ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Open issues</dt>
            <dd className="text-lg font-semibold">{data.openIssues ?? 0}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Last commit</dt>
            <dd className="text-lg font-semibold">
              {data.lastCommitAt ? new Date(data.lastCommitAt).toLocaleString() : "Unknown"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Activity Snapshot</h2>
          {isLoadingActivity && (
            <span className="inline-flex items-center gap-2 text-xs text-amber-400">
              <ReloadIcon className="h-3 w-3 animate-spin" />
              Fetching activity data...
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {isLoadingActivity ? (
            <span className="text-amber-400">Processing in background...</span>
          ) : (
            <>Updated {data.health?.refreshedAt ? new Date(data.health.refreshedAt).toLocaleString() : "never"}</>
          )}
        </p>
        
        {isLoadingActivity ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Loading...</dt>
                <dd className="mt-1 h-7 w-16 rounded bg-slate-800"></dd>
              </div>
            ))}
          </div>
        ) : (
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pull requests opened</dt>
              <dd className="text-lg font-semibold">{data.health?.activity?.prsOpened ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Pull requests merged</dt>
              <dd className="text-lg font-semibold">{data.health?.activity?.prsMerged ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Issues opened</dt>
              <dd className="text-lg font-semibold">{data.health?.activity?.issuesOpened ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Comments on issues</dt>
              <dd className="text-lg font-semibold">{data.health?.activity?.issuesComment ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Mean merge days</dt>
              <dd className="text-lg font-semibold">
                {data.health?.activity?.meanMergeDays?.toFixed(1) ?? "0.0"}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

