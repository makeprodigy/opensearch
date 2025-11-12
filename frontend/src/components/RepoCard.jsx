import { Link } from "react-router-dom";
import { StarIcon } from "@radix-ui/react-icons";

export default function RepoCard({ repo }) {
  return (
    <Link
      to={`/repos/${repo.fullName}`}
      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/20 transition hover:border-brand hover:shadow-brand/20 min-h-[240px]"
    >
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-100 break-words">{repo.fullName}</h2>
        <p className="text-sm text-slate-400 line-clamp-3">
          {repo.description || "No description provided."}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-amber-300" />
          {repo.stars?.toLocaleString() ?? 0}
        </span>
        <span>Issues: {repo.openIssues ?? 0}</span>
        <span>Forks: {repo.forks ?? 0}</span>
        <span>
          Updated:{" "}
          {repo.lastCommitAt
            ? new Date(repo.lastCommitAt).toLocaleDateString()
            : "Unknown"}
        </span>
      </div>
    </Link>
  );
}

