/**
 * Health score calculation based on repository metadata and recent activity.
 * The score intentionally caps each factor to avoid any single metric dominating.
 * Weightings prioritize activity (PRs, issues, commits) over popularity (stars).
 */
export function computeHealthScore(repo, activitySummary) {
  if (!repo) return 0;

  const lastCommitAt = repo.lastCommitAt ? new Date(repo.lastCommitAt) : null;
  const now = Date.now();

  // Recency: 30 points (last commit within 180 days = full score)
  const recency =
    lastCommitAt != null
      ? Math.max(0, 1 - (now - lastCommitAt.getTime()) / (1000 * 60 * 60 * 24 * 180))
      : 0;

  // Stars: 10 points (logarithmic, 10k stars = full score)
  const stars = Math.min(Math.log10((repo.stars ?? 0) + 1) / 4, 1);

  // Open Issues: 10 points (more open issues = more engagement)
  const openIssuesScore = Math.min((repo.openIssues ?? 0) / 100, 1);

  // PRs Opened (30 days): 25 points (20+ PRs = full score)
  const prsOpened = activitySummary?.prsOpened ?? 0;
  const prsOpenedScore = Math.min(prsOpened / 20, 1);

  // PRs Merged (30 days): 15 points (10+ merged = full score)
  const prsMerged = activitySummary?.prsMerged ?? 0;
  const prsMergedScore = Math.min(prsMerged / 10, 1);

  // Issues Opened (30 days): 10 points (10+ issues = full score)
  const issuesOpened = activitySummary?.issuesOpened ?? 0;
  const issuesOpenedScore = Math.min(issuesOpened / 10, 1);

  const score = Math.round(
    30 * recency +
      10 * stars +
      10 * openIssuesScore +
      25 * prsOpenedScore +
      15 * prsMergedScore +
      10 * issuesOpenedScore,
  );
  return Math.min(100, score);
}

export function summarizeActivity({ pulls = [], issues = [] } = {}) {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 1000 * 60 * 60 * 24 * 30);

  const prsOpened = pulls.length;
  const prsMerged = pulls.filter((pull) => pull.merged_at != null).length;

  const issuesOpened = issues.filter((issue) => !issue.pull_request).length;
  const issuesComment = issues.reduce((total, issue) => total + (issue.comments ?? 0), 0);

  let meanMergeDays = 0;
  const mergeDurations = pulls
    .filter((pull) => pull.merged_at && pull.created_at)
    .map((pull) => {
      const created = new Date(pull.created_at).getTime();
      const merged = new Date(pull.merged_at).getTime();
      return (merged - created) / (1000 * 60 * 60 * 24);
    });

  if (mergeDurations.length > 0) {
    meanMergeDays = mergeDurations.reduce((sum, value) => sum + value, 0) / mergeDurations.length;
  }

  return {
    windowStart,
    windowEnd,
    prsOpened,
    prsMerged,
    issuesOpened,
    issuesComment,
    meanMergeDays,
  };
}

