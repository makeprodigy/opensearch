import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import FilterSidebar from "../components/FilterSidebar.jsx";
import RepoCard from "../components/RepoCard.jsx";
import Skeleton from "../components/Skeleton.jsx";
import api from "../services/api.js";

const RESULTS_PER_PAGE = 21;

const DEFAULT_FILTER_VALUES = Object.freeze({
  keywords: "",
  language: "",
  minStars: 50,
  minForks: "",
  minGoodFirstIssues: 1,
  topics: "",
  license: "",
  archived: "exclude",
  updatedPreset: "",
  updatedSince: "",
  sort: "best-match",
  order: "desc",
});

const UPDATED_PRESETS = ["30", "90", "365"];

function createDefaultFilters(overrides = {}) {
  return { ...DEFAULT_FILTER_VALUES, ...overrides };
}

function normalizeNumeric(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return "";
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return "";
  }
  return parsed;
}

function extractNumericValue(rawValue, fallback) {
  const match = rawValue.match(/(\d+)/);
  if (!match) {
    return fallback;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getPresetDate(preset) {
  const days = Number.parseInt(preset, 10);
  if (Number.isNaN(days) || days <= 0) {
    return "";
  }
  const now = new Date();
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const targetUtc = utcNow - days * 24 * 60 * 60 * 1000;
  const target = new Date(targetUtc);
  return target.toISOString().slice(0, 10);
}

function detectUpdatedPreset(dateString) {
  const target = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  const now = new Date();
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcTarget = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const diffDays = Math.round((utcNow - utcTarget) / (24 * 60 * 60 * 1000));

  for (const preset of UPDATED_PRESETS) {
    const presetDays = Number.parseInt(preset, 10);
    if (Math.abs(diffDays - presetDays) <= 1) {
      return preset;
    }
  }

  return null;
}

function normalizeTopicSlug(topic) {
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function buildQueryFromFilters(filters) {
  const tokens = [];
  if (filters.keywords.trim()) {
    tokens.push(filters.keywords.trim());
  }
  if (filters.language) {
    tokens.push(`language:${filters.language}`);
  }

  const topicTokens = filters.topics
    .split(",")
    .map((topic) => normalizeTopicSlug(topic))
    .filter(Boolean);
  topicTokens.forEach((topic) => tokens.push(`topic:${topic}`));

  if (filters.license) {
    tokens.push(`license:${filters.license}`);
  }

  if (filters.minStars !== "" && !Number.isNaN(filters.minStars)) {
    tokens.push(`stars:>=${filters.minStars}`);
  }

  if (filters.minForks !== "" && !Number.isNaN(filters.minForks)) {
    tokens.push(`forks:>=${filters.minForks}`);
  }

  if (filters.minGoodFirstIssues !== "" && !Number.isNaN(filters.minGoodFirstIssues)) {
    tokens.push(`good-first-issues:>=${filters.minGoodFirstIssues}`);
  } else {
    tokens.push("good-first-issues:>0");
  }

  if (filters.archived === "exclude") {
    tokens.push("archived:false");
  } else if (filters.archived === "only") {
    tokens.push("archived:true");
  }

  if (filters.updatedPreset === "custom" && filters.updatedSince) {
    tokens.push(`pushed:>=${filters.updatedSince}`);
  } else if (filters.updatedPreset && filters.updatedPreset !== "custom") {
    const since = getPresetDate(filters.updatedPreset);
    if (since) {
      tokens.push(`pushed:>=${since}`);
    }
  }

  return tokens.join(" ").trim();
}

const DEFAULT_QUERY = buildQueryFromFilters(createDefaultFilters());

function parseQueryToFilters(rawQuery, sortParam, orderParam) {
  const filters = createDefaultFilters({ sort: sortParam, order: orderParam });
  const query = (rawQuery ?? "").trim();
  if (!query) {
    return filters;
  }

  const tokens = query.split(/\s+/).filter(Boolean);
  const keywordTokens = [];
  const topics = [];

  tokens.forEach((token) => {
    if (!token.includes(":")) {
      keywordTokens.push(token);
      return;
    }

    const [rawKey, ...rest] = token.split(":");
    const key = rawKey.toLowerCase();
    const rawValue = rest.join(":");

    switch (key) {
      case "language":
        filters.language = rawValue;
        break;
      case "stars":
        filters.minStars = extractNumericValue(rawValue, filters.minStars);
        break;
      case "forks":
        filters.minForks = extractNumericValue(rawValue, "");
        break;
      case "good-first-issues":
        filters.minGoodFirstIssues = extractNumericValue(rawValue, filters.minGoodFirstIssues);
        break;
      case "license":
        filters.license = rawValue;
        break;
      case "topic":
        topics.push(rawValue);
        break;
      case "archived":
        if (rawValue === "true") {
          filters.archived = "only";
        } else if (rawValue === "false") {
          filters.archived = "exclude";
        } else {
          filters.archived = "include";
        }
        break;
      case "pushed": {
        const match = rawValue.match(/>=([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (match) {
          const date = match[1];
          const matchedPreset = detectUpdatedPreset(date);
          if (matchedPreset) {
            filters.updatedPreset = matchedPreset;
            filters.updatedSince = "";
          } else {
            filters.updatedPreset = "custom";
            filters.updatedSince = date;
          }
          break;
        }
        keywordTokens.push(token);
        break;
      }
      default:
        keywordTokens.push(token);
    }
  });

  filters.keywords = keywordTokens.join(" ");
  if (topics.length > 0) {
    filters.topics = topics.join(", ");
  }

  return filters;
}

export default function Home() {
  const [params, setParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [repos, setRepos] = useState([]);
  const [total, setTotal] = useState(0);
  const queryParam = params.get("q") ?? DEFAULT_QUERY;
  const sortParam = params.get("sort") ?? DEFAULT_FILTER_VALUES.sort;
  const orderParam =
    params.get("order") ??
    (sortParam === "best-match" ? "desc" : DEFAULT_FILTER_VALUES.order);
  const pageParam = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isNaN(pageParam) ? 1 : Math.max(1, pageParam);

  const derivedFilters = useMemo(
    () => parseQueryToFilters(queryParam, sortParam, orderParam),
    [queryParam, sortParam, orderParam],
  );

  const [filters, setFilters] = useState(derivedFilters);

  useEffect(() => {
    setFilters(derivedFilters);
  }, [derivedFilters]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get("/search", {
          params: {
            q: queryParam,
            page,
            perPage: RESULTS_PER_PAGE,
            sort: sortParam,
            order: orderParam,
          },
        });
        setRepos(response.data.items);
        setTotal(response.data.totalCount);
      } catch (fetchError) {
        setError(fetchError.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [queryParam, page, sortParam, orderParam]);

  function handleApplyFilters(nextFilters) {
    const normalized = {
      ...nextFilters,
      minStars: normalizeNumeric(nextFilters.minStars),
      minForks: normalizeNumeric(nextFilters.minForks),
      minGoodFirstIssues: normalizeNumeric(nextFilters.minGoodFirstIssues),
      updatedSince:
        nextFilters.updatedPreset === "custom" ? nextFilters.updatedSince : "",
    };

    setFilters(normalized);

    const nextQuery = buildQueryFromFilters(normalized) || DEFAULT_QUERY;

    const nextSearchParams = {
      q: nextQuery,
      page: "1",
      sort: normalized.sort,
      order: normalized.order,
    };

    setParams(nextSearchParams);
  }

  function handleResetFilters() {
    handleApplyFilters(createDefaultFilters());
  }

  function handlePageChange(delta) {
    const nextPage = Math.max(1, page + delta);
    if (nextPage === page) {
      return;
    }

    const nextSearchParams = {
      q: queryParam,
      page: String(nextPage),
      sort: sortParam,
      order: orderParam,
    };

    setParams(nextSearchParams);
  }

  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE));

  return (
    <div className="space-y-10">
      <section className="space-y-5 text-center">
        <div className="inline-flex items-center rounded-full border border-brand/40 bg-brand/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
          Good first issues at a glance
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-5xl">
          Discover welcoming open-source projects.
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base">
          Open Search surfaces repositories that actively maintain good first issues.
          Each project is ranked by a health score that blends stars, recency, and community activity.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <FilterSidebar
          filters={filters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          disabled={loading}
        />
        <div className="space-y-6">
          {loading ? (
            <Skeleton rows={7} />
          ) : error ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <>
              {repos.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400">
                  No repositories found. Try adjusting your filters or broadening the search.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {repos.map((repo) => (
                    <RepoCard key={repo.fullName} repo={repo} />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-800 px-3 py-1 transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handlePageChange(-1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-800 px-3 py-1 transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handlePageChange(1)}
                    disabled={page >= totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

