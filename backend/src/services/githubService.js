/**
 * GitHub API service wrapper.
 * 
 * This module provides a thin wrapper around the GitHub REST API with:
 * - Shared headers and authentication (Bearer token from env)
 * - Automatic retry logic with exponential backoff for rate limits
 * - ETag support for efficient conditional requests
 * - Domain-specific helpers for repository search and activity fetching
 * 
 * All requests use the GitHub token from GITHUB_TOKEN env var to increase
 * rate limits from 60/hour (unauthenticated) to 5000/hour (authenticated).
 */
import axios from "axios";

// Configure axios instance for GitHub API
const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json", // Request JSON response format
    "User-Agent": "GoodFirstFinder/0.1.0 (+https://github.com/)", // Required by GitHub API
  },
  timeout: 10_000, // 10 second timeout
});

// Add authentication token to all requests if available
githubApi.interceptors.request.use((config) => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Retry helper with exponential backoff for GitHub rate limits.
 * 
 * Handles 403 Forbidden responses (rate limit exceeded) by:
 * 1. Reading Retry-After header from GitHub response
 * 2. Waiting the specified time before retrying
 * 3. Falling back to exponential backoff (3s, 6s, 9s) if no header
 * 4. Maximum 3 retry attempts
 * 
 * @param {Function} requestFn - Async function to retry
 * @param {number} attempt - Current attempt number (1-3)
 * @returns {Promise} Result of requestFn or throws error after max attempts
 */
async function withRetry(requestFn, attempt = 1) {
  try {
    return await requestFn();
  } catch (error) {
    const status = error.response?.status;
    // Retry on 403 (rate limit) up to 3 times
    if (status === 403 && attempt <= 3) {
      // Use Retry-After header if provided, otherwise exponential backoff
      const retryAfterSeconds =
        Number.parseInt(error.response.headers["retry-after"] ?? "0", 10) || attempt * 3;
      await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
      return withRetry(requestFn, attempt + 1);
    }
    throw error;
  }
}

/**
 * Normalizes GitHub search query by adding default filters.
 * 
 * Ensures all searches:
 * - Include repositories with good-first-issues (unless already specified)
 * - Exclude archived repositories (unless already specified)
 * 
 * This helps users find beginner-friendly, active repositories by default.
 * 
 * @param {string} rawQuery - Raw search query from user
 * @returns {string} Normalized query with default filters
 */
function normalizeSearchQuery(rawQuery = "") {
  const trimmed = (rawQuery ?? "").trim();
  const parts = trimmed ? [trimmed] : [];

  // Add good-first-issues filter if not present
  if (!/\bgood-first-issues:/.test(trimmed)) {
    parts.push("good-first-issues:>0");
  }

  // Exclude archived repos by default if not specified
  if (!/\barchived:/.test(trimmed)) {
    parts.push("archived:false");
  }

  return parts.join(" ").trim();
}

/**
 * Searches GitHub repositories.
 * 
 * @param {Object} options - Search parameters
 * @param {string} options.query - GitHub search query (supports GitHub syntax)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.perPage - Results per page (default: 10)
 * @param {string} options.sort - Sort by: updated, stars, forks, best-match (default: "updated")
 * @param {string} options.order - Sort order: asc, desc (default: "desc")
 * @returns {Promise<Object>} Search results with totalCount and items array
 * 
 * Note: Automatically adds good-first-issues and archived filters if not present.
 * Uses retry logic for rate limit handling.
 */
export async function searchRepositories({
  query,
  page = 1,
  perPage = 10,
  sort = "updated",
  order = "desc",
}) {
  return withRetry(async () => {
    // Normalize query with default filters
    const normalizedQuery = normalizeSearchQuery(query);
    // GitHub API doesn't support sort/order for best-match
    const normalizedSort = sort === "best-match" ? undefined : sort;
    const normalizedOrder = normalizedSort ? order ?? "desc" : undefined;

    const response = await githubApi.get("/search/repositories", {
      params: {
        q: normalizedQuery,
        ...(normalizedSort
          ? {
              sort: normalizedSort,
              order: normalizedOrder,
            }
          : {}),
        page,
        per_page: perPage,
      },
    });

    // Transform GitHub API response to our domain model
    return {
      totalCount: response.data.total_count,
      items: response.data.items?.map((repo) => ({
        id: repo.id,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        defaultBranch: repo.default_branch,
        lastCommitAt: repo.pushed_at,
        language: repo.language,
        htmlUrl: repo.html_url,
      })),
    };
  });
}

/**
 * Fetches detailed information about a specific repository.
 * 
 * Uses ETag for conditional requests - if repository hasn't changed,
 * GitHub returns 304 Not Modified, saving bandwidth and API calls.
 * 
 * @param {string} fullName - Repository full name (e.g., "facebook/react")
 * @param {Object} options - Fetch options
 * @param {string} options.etag - Optional ETag from previous request for conditional fetch
 * @returns {Promise<Object>} Repository data with ETag and rate limit info
 * 
 * Returns:
 *   - If 304: { etag, data: null } (data unchanged)
 *   - If 200: { etag, data: {...}, rateLimitRemaining, rateLimitReset }
 */
export async function fetchRepository(fullName, { etag } = {}) {
  return withRetry(async () => {
    const response = await githubApi.get(`/repos/${fullName}`, {
      // Use conditional request if we have ETag
      headers: etag ? { "If-None-Match": etag } : undefined,
      // Accept both 200 (OK) and 304 (Not Modified) as valid responses
      validateStatus(status) {
        return [200, 304].includes(status);
      },
    });

    // Repository unchanged - return cached ETag
    if (response.status === 304) {
      return { etag, data: null };
    }

    // Repository data changed - return new data and ETag
    return {
      etag: response.headers.etag, // Store ETag for next request
      data: {
        id: response.data.id,
        fullName: response.data.full_name,
        description: response.data.description,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        openIssues: response.data.open_issues_count,
        defaultBranch: response.data.default_branch,
        lastCommitAt: response.data.pushed_at,
        hasGoodFirstIssues: response.data.open_issues_count > 0,
      },
      // Include rate limit info for monitoring
      rateLimitRemaining: Number.parseInt(response.headers["x-ratelimit-remaining"] ?? "0", 10),
      rateLimitReset: Number.parseInt(response.headers["x-ratelimit-reset"] ?? "0", 10),
    };
  });
}

/**
 * Fetches activity data for a repository (commits, issues, pull requests).
 * 
 * This function makes 3 parallel API calls to get:
 * - Commits since the specified date
 * - Issues (opened/closed) since the specified date
 * - Pull requests (all states) sorted by update time
 * 
 * Used by the background worker to calculate health scores based on
 * 30-day activity windows.
 * 
 * @param {string} fullName - Repository full name (e.g., "facebook/react")
 * @param {Object} options - Fetch options
 * @param {string} options.since - ISO date string (e.g., "2024-01-01T00:00:00Z")
 * @returns {Promise<Object>} Activity data with commits, issues, and pulls arrays
 */
export async function fetchRepositoryActivity(fullName, { since }) {
  return withRetry(async () => {
    // Fetch all activity data in parallel for efficiency
    const [commits, issues, pulls] = await Promise.all([
      // Get commits since the specified date
      githubApi.get(`/repos/${fullName}/commits`, { params: { since } }),
      // Get all issues (opened and closed) since the date
      githubApi.get(`/repos/${fullName}/issues`, {
        params: { since, state: "all", filter: "all" },
      }),
      // Get all pull requests (all states), sorted by most recently updated
      githubApi.get(`/repos/${fullName}/pulls`, {
        params: { state: "all", sort: "updated", direction: "desc" },
      }),
    ]);

    return {
      commits: commits.data,
      issues: issues.data,
      pulls: pulls.data,
    };
  });
}

