/**
 * Health score calculation algorithm.
 * 
 * Calculates a 0-100 health score for repositories based on multiple factors.
 * The score prioritizes activity (PRs, issues, commits) over popularity (stars)
 * to identify actively maintained projects suitable for beginners.
 * 
 * Each factor is capped to prevent any single metric from dominating the score.
 * 
 * Scoring breakdown:
 * - Recency (30%): Last commit within 180 days
 * - Stars (10%): Logarithmic scale, 10k+ stars = full score
 * - Open Issues (10%): Community engagement indicator
 * - PRs Opened (25%): Active contribution indicator (30-day window)
 * - PRs Merged (15%): Maintainer responsiveness (30-day window)
 * - Issues Opened (10%): Community activity (30-day window)
 * 
 * @param {Object} repo - Repository data (stars, forks, openIssues, lastCommitAt)
 * @param {Object|null} activitySummary - Activity data from summarizeActivity() or null
 * @returns {number} Health score from 0-100
 */
export function computeHealthScore(repo, activitySummary) {
  if (!repo) return 0;

  const lastCommitAt = repo.lastCommitAt ? new Date(repo.lastCommitAt) : null;
  const now = Date.now();

  // Recency: 30 points (last commit within 180 days = full score)
  // Linear decay: 0 days = 1.0, 180 days = 0.0, >180 days = 0.0
  const recency =
    lastCommitAt != null
      ? Math.max(0, 1 - (now - lastCommitAt.getTime()) / (1000 * 60 * 60 * 24 * 180))
      : 0;

  // Stars: 10 points (logarithmic scale, 10k stars = full score)
  // Uses log10 to prevent mega-popular repos from dominating
  // log10(10000+1) / 4 ≈ 1.0
  const stars = Math.min(Math.log10((repo.stars ?? 0) + 1) / 4, 1);

  // Open Issues: 10 points (more open issues = more engagement)
  // 100+ open issues = full score
  const openIssuesScore = Math.min((repo.openIssues ?? 0) / 100, 1);

  // PRs Opened (30 days): 25 points (20+ PRs = full score)
  // Highest weight - indicates active contribution
  const prsOpened = activitySummary?.prsOpened ?? 0;
  const prsOpenedScore = Math.min(prsOpened / 20, 1);

  // PRs Merged (30 days): 15 points (10+ merged = full score)
  // Indicates maintainer responsiveness
  const prsMerged = activitySummary?.prsMerged ?? 0;
  const prsMergedScore = Math.min(prsMerged / 10, 1);

  // Issues Opened (30 days): 10 points (10+ issues = full score)
  // Indicates active community discussion
  const issuesOpened = activitySummary?.issuesOpened ?? 0;
  const issuesOpenedScore = Math.min(issuesOpened / 10, 1);

  // Calculate weighted sum and round to integer
  const score = Math.round(
    30 * recency +
      10 * stars +
      10 * openIssuesScore +
      25 * prsOpenedScore +
      15 * prsMergedScore +
      10 * issuesOpenedScore,
  );
  // Cap at 100
  return Math.min(100, score);
}

/**
 * Summarizes repository activity data into metrics for health score calculation.
 * 
 * Processes raw GitHub API data (pulls and issues) from a 30-day window and
 * calculates aggregated metrics:
 * - PRs opened and merged
 * - Issues opened (excluding PRs, which are also returned in issues endpoint)
 * - Total issue comments
 * - Mean time to merge PRs (in days)
 * 
 * @param {Object} data - Raw activity data from GitHub API
 * @param {Array} data.pulls - Array of pull request objects
 * @param {Array} data.issues - Array of issue objects (includes PRs)
 * @returns {Object} Activity summary with metrics and time window
 */
export function summarizeActivity({ pulls = [], issues = [] } = {}) {
  // Define 30-day activity window (ending now)
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 1000 * 60 * 60 * 24 * 30);

  // Count total PRs opened in the window
  const prsOpened = pulls.length;
  // Count PRs that were merged (merged_at is not null)
  const prsMerged = pulls.filter((pull) => pull.merged_at != null).length;

  // Filter out PRs from issues (GitHub API returns PRs in issues endpoint too)
  // PRs have a pull_request property, real issues don't
  const issuesOpened = issues.filter((issue) => !issue.pull_request).length;
  // Sum total comments across all issues
  const issuesComment = issues.reduce((total, issue) => total + (issue.comments ?? 0), 0);

  // Calculate mean time to merge PRs (in days)
  let meanMergeDays = 0;
  const mergeDurations = pulls
    .filter((pull) => pull.merged_at && pull.created_at) // Only merged PRs with timestamps
    .map((pull) => {
      const created = new Date(pull.created_at).getTime();
      const merged = new Date(pull.merged_at).getTime();
      return (merged - created) / (1000 * 60 * 60 * 24); // Convert to days
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

