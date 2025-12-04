import { Link } from "react-router-dom";
import { StarIcon } from "@radix-ui/react-icons";

export default function RepoCard({ repo }) {
  return (
    <Link
      to={`/repos/${repo.fullName}`}
      className="flex flex-col justify-between rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm transition min-h-[240px]"
      style={{
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#2F7A4F';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(47, 122, 79, 0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
      }}
    >
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 break-words">{repo.fullName}</h2>
        <p className="text-sm text-gray-600 line-clamp-3">
          {repo.description || "No description provided."}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1 font-medium">
          <StarIcon className="h-4 w-4 text-amber-500" />
          <span className="text-gray-700">{repo.stars?.toLocaleString() ?? 0}</span>
        </span>
        <span className="text-gray-700">Issues: {repo.openIssues ?? 0}</span>
        <span className="text-gray-700">Forks: {repo.forks ?? 0}</span>
        <span className="text-gray-600">
          Updated:{" "}
          {repo.lastCommitAt
            ? new Date(repo.lastCommitAt).toLocaleDateString()
            : "Unknown"}
        </span>
      </div>
    </Link>
  );
}
