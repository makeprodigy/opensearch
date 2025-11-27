/**
 * Search routes for querying GitHub repositories.
 * 
 * This module handles:
 * - General repository search (proxies to GitHub API, calculates health scores on-the-fly)
 * - Individual repository details (fetches from GitHub, caches in DB, queues refresh jobs)
 * 
 * Search results are NOT persisted to the database - they're calculated on-the-fly.
 * Repository details ARE persisted when users view them, enabling caching and activity tracking.
 */
import { Router } from "express";

import prisma from "../services/prismaClient.js";
import { searchRepositories, fetchRepository } from "../services/githubService.js";
import { computeHealthScore } from "../services/healthScore.js";
import { makeRateLimiter } from "../utils/rateLimiter.js";

const router = Router();
// Rate limiter: 20 requests per minute per IP
const rateLimiter = makeRateLimiter({ tokensPerInterval: 20, intervalMs: 60_000 });

/**
 * GET /api/search
 * 
 * Searches GitHub repositories and returns results with health scores.
 * 
 * Query parameters:
 *   - q: string (required) - GitHub search query
 *   - page: number (default: 1) - Page number
 *   - perPage: number (default: 10, max: 30) - Results per page
 *   - sort: string (default: "updated") - Sort by: updated, stars, forks, best-match
 *   - order: string (default: "desc") - Sort order: asc, desc
 * 
 * Returns:
 *   - 200: Search results with health scores (calculated on-the-fly, not persisted)
 *   - 400: Missing query parameter
 *   - 429: Rate limit exceeded
 * 
 * Note: Search results are NOT stored in the database. Health scores are
 * calculated on-the-fly without activity data (only basic metrics).
 */
router.get("/", rateLimiter, async (req, res, next) => {
  try {
    const { q, page = 1, perPage = 10, sort, order } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Missing query parameter 'q'" });
    }

    // Proxy search to GitHub API
    const searchResult = await searchRepositories({
      query: q,
      page: Number.parseInt(page, 10) || 1,
      perPage: Math.min(Number.parseInt(perPage, 10) || 10, 30),
      sort,
      order,
    });

    // Calculate health scores on-the-fly without persisting to database
    // This allows us to show health scores for all search results without
    // requiring database storage for every repository
    const itemsWithHealthScore = searchResult.items.map((item) => {
      const lastCommitAt = item.lastCommitAt ? new Date(item.lastCommitAt) : null;
      // Compute health score with basic metrics only (no activity data)
      const healthScore = computeHealthScore(
        { ...item, lastCommitAt, stars: item.stars ?? 0 },
        null, // No activity summary available for search results
      );

      return {
        ...item,
        healthScore,
        lastCommitAt,
      };
    });

    return res.json({ 
      totalCount: searchResult.totalCount, 
      items: itemsWithHealthScore 
    });
  } catch (error) {
    // Handle GitHub API 304 Not Modified response
    if (error.response?.status === 304) {
      return res.json({ totalCount: 0, items: [] });
    }
    return next(error);
  }
});

/**
 * GET /api/search/:owner/:repo
 * 
 * Fetches detailed information about a specific repository.
 * 
 * This endpoint:
 * 1. Checks if repository exists in database cache
 * 2. Fetches fresh data from GitHub API (uses ETag for efficient caching)
 * 3. Creates or updates repository record in database
 * 4. Queues a background job to refresh activity data if needed
 * 
 * Path parameters:
 *   - owner: string - Repository owner (e.g., "facebook")
 *   - repo: string - Repository name (e.g., "react")
 * 
 * Returns:
 *   - 200: Repository details with latest activity data
 *   - 404: Repository not found on GitHub
 * 
 * Note: This endpoint persists repository data to enable caching and
 * activity tracking. The lastFetchedAt timestamp is used for TTL cleanup.
 */
router.get("/:owner/:repo", async (req, res, next) => {
  try {
    const fullName = `${req.params.owner}/${req.params.repo}`;

    // Check if repo exists in database cache
    let repository = await prisma.repository.findUnique({
      where: { fullName },
      include: {
        // Include latest activity data (30-day window)
        activities: {
          orderBy: { windowEnd: "desc" },
          take: 1,
        },
      },
    });

    // Fetch fresh data from GitHub API
    // If repository exists, pass ETag to get 304 Not Modified if unchanged
    const fetched = await fetchRepository(fullName, {
      etag: repository?.etag,
    });

    // If repo doesn't exist in DB, create it with current timestamp
    if (!repository) {
      const calculatedHealthScore = computeHealthScore(
        {
          stars: fetched.data.stars,
          forks: fetched.data.forks,
          openIssues: fetched.data.openIssues,
          lastCommitAt: fetched.data.lastCommitAt
            ? new Date(fetched.data.lastCommitAt)
            : null,
        },
        null,
      );

      // Create new repository record in database
      repository = await prisma.repository.create({
        data: {
          fullName,
          description: fetched.data.description,
          stars: fetched.data.stars,
          forks: fetched.data.forks,
          openIssues: fetched.data.openIssues,
          defaultBranch: fetched.data.defaultBranch,
          lastCommitAt: fetched.data.lastCommitAt
            ? new Date(fetched.data.lastCommitAt)
            : null,
          hasGoodFirstIssues: fetched.data.hasGoodFirstIssues,
          etag: fetched.etag, // Store ETag for conditional requests
          healthScore: calculatedHealthScore,
          lastFetchedAt: new Date(), // Track when fetched (used for TTL cleanup)
        },
        include: {
          activities: true,
        },
      });
    } else if (fetched.data) {
      // Repository data was modified on GitHub - update our cache
      repository = await prisma.repository.update({
        where: { id: repository.id },
        data: {
          description: fetched.data.description,
          stars: fetched.data.stars,
          forks: fetched.data.forks,
          openIssues: fetched.data.openIssues,
          defaultBranch: fetched.data.defaultBranch,
          lastCommitAt: fetched.data.lastCommitAt
            ? new Date(fetched.data.lastCommitAt)
            : null,
          hasGoodFirstIssues: fetched.data.hasGoodFirstIssues,
          etag: fetched.etag, // Update ETag
          lastFetchedAt: new Date(), // Update access timestamp
        },
        include: {
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      });
    } else {
      // GitHub returned 304 Not Modified (data unchanged)
      // Still update lastFetchedAt to prevent TTL cleanup
      repository = await prisma.repository.update({
        where: { id: repository.id },
        data: {
          lastFetchedAt: new Date(), // Keep repository fresh in cache
        },
        include: {
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      });
    }

    // Queue a background job to refresh activity data if needed
    // Activity data (PRs, issues) changes frequently and requires multiple API calls
    const now = Date.now();
    const refreshThresholdMs = 1000 * 60 * 60 * 12; // 12 hours
    const needsRefresh =
      !repository.healthRefreshedAt ||
      now - repository.healthRefreshedAt.getTime() > refreshThresholdMs;

    if (needsRefresh) {
      // Check if a refresh job is already queued to avoid duplicates
      const existingJob = await prisma.fetchJob.findFirst({
        where: {
          kind: "refreshRepo",
          status: { in: ["queued", "processing"] },
          payload: {
            path: "$.repoId",
            equals: repository.id,
          },
        },
      });

      // Queue refresh job if not already queued
      // The background worker will fetch activity data and update health score
      if (!existingJob) {
        await prisma.fetchJob.create({
          data: {
            kind: "refreshRepo",
            payload: { repoId: repository.id },
          },
        });
      }
    }

    return res.json(repository);
  } catch (error) {
    return next(error);
  }
});

export default router;

