/**
 * Thin wrapper around the GitHub REST API that applies shared headers,
 * handles rate-limit friendly retries, and exposes helpers tailored
 * to the GoodFirstFinder domain.
 */
import axios from "axios";

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "GoodFirstFinder/0.1.0 (+https://github.com/)",
  },
  timeout: 10_000,
});

githubApi.interceptors.request.use((config) => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Simple exponential backoff helper for 403/secondary rate limits.
 */
async function withRetry(requestFn, attempt = 1) {
  try {
    return await requestFn();
  } catch (error) {
    const status = error.response?.status;
    if (status === 403 && attempt <= 3) {
      const retryAfterSeconds =
        Number.parseInt(error.response.headers["retry-after"] ?? "0", 10) || attempt * 3;
      await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000));
      return withRetry(requestFn, attempt + 1);
    }
    throw error;
  }
}

function normalizeSearchQuery(rawQuery = "") {
  const trimmed = (rawQuery ?? "").trim();
  const parts = trimmed ? [trimmed] : [];

  if (!/\bgood-first-issues:/.test(trimmed)) {
    parts.push("good-first-issues:>0");
  }

  if (!/\barchived:/.test(trimmed)) {
    parts.push("archived:false");
  }

  return parts.join(" ").trim();
}

export async function searchRepositories({
  query,
  page = 1,
  perPage = 10,
  sort = "updated",
  order = "desc",
}) {
  return withRetry(async () => {
    const normalizedQuery = normalizeSearchQuery(query);
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

export async function fetchRepository(fullName, { etag } = {}) {
  return withRetry(async () => {
    const response = await githubApi.get(`/repos/${fullName}`, {
      headers: etag ? { "If-None-Match": etag } : undefined,
      validateStatus(status) {
        return [200, 304].includes(status);
      },
    });

    if (response.status === 304) {
      return { etag, data: null };
    }

    return {
      etag: response.headers.etag,
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
      rateLimitRemaining: Number.parseInt(response.headers["x-ratelimit-remaining"] ?? "0", 10),
      rateLimitReset: Number.parseInt(response.headers["x-ratelimit-reset"] ?? "0", 10),
    };
  });
}

export async function fetchRepositoryActivity(fullName, { since }) {
  return withRetry(async () => {
    const [commits, issues, pulls] = await Promise.all([
      githubApi.get(`/repos/${fullName}/commits`, { params: { since } }),
      githubApi.get(`/repos/${fullName}/issues`, {
        params: { since, state: "all", filter: "all" },
      }),
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

