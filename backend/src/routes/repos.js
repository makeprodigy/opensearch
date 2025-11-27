/**
 * Repository management routes.
 * 
 * This module handles:
 * - Listing stored repositories (paginated, sorted by health score)
 * - Manually triggering repository refresh jobs
 * - Getting repository health score details
 * - Manual cleanup of stale repositories (admin only)
 * 
 * Most endpoints are public, but refresh and cleanup require authentication.
 */
import { Router } from "express";

import prisma from "../services/prismaClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { computeHealthScore } from "../services/healthScore.js";
import { cleanupStaleRepositories } from "../jobs/cleanupRepos.js";

const router = Router();

/**
 * GET /api/repos
 * 
 * Lists all stored repositories, sorted by health score (highest first).
 * 
 * Query parameters:
 *   - page: number (default: 1) - Page number
 *   - perPage: number (default: 12, max: 50) - Results per page
 * 
 * Returns:
 *   - 200: Paginated list of repositories with latest activity data
 * 
 * Note: Only returns repositories that have been viewed/accessed and
 * stored in the database. Search results are not included here.
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, perPage = 12 } = req.query;
    const currentPage = Number.parseInt(page, 10) || 1;
    const pageSize = Math.min(Number.parseInt(perPage, 10) || 12, 50);

    // Fetch total count and repositories in parallel for efficiency
    const [total, repositories] = await Promise.all([
      prisma.repository.count(),
      prisma.repository.findMany({
        // Sort by health score (best repositories first)
        orderBy: { healthScore: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        include: {
          // Include latest activity data (30-day window)
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    // Flatten activity data for easier frontend consumption
    const items = repositories.map((repo) => ({
      ...repo,
      latestActivity: repo.activities[0] ?? null,
    }));

    return res.json({
      total,
      page: currentPage,
      perPage: pageSize,
      items,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/repos/:id/refresh
 * 
 * Manually triggers a refresh job for a repository.
 * Requires authentication.
 * 
 * Path parameters:
 *   - id: number - Repository ID
 * 
 * Returns:
 *   - 200: Refresh job queued successfully
 *   - 400: Invalid repository ID
 *   - 401: Unauthorized (missing/invalid token)
 *   - 404: Repository not found
 * 
 * The background worker will fetch fresh data from GitHub and update
 * the repository's health score and activity metrics.
 */
router.post("/:id/refresh", authMiddleware, async (req, res, next) => {
  try {
    const repoId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(repoId)) {
      return res.status(400).json({ message: "Invalid repository id" });
    }

    // Verify repository exists
    const repository = await prisma.repository.findUnique({ where: { id: repoId } });
    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if a refresh job is already queued to avoid duplicates
    const existingJob = await prisma.fetchJob.findFirst({
      where: {
        kind: "refreshRepo",
        status: { in: ["queued", "processing"] },
        payload: {
          path: "$.repoId",
          equals: repoId,
        },
      },
    });

    if (existingJob) {
      return res.json({ message: "Refresh already queued" });
    }

    // Queue refresh job for background worker
    await prisma.fetchJob.create({
      data: {
        kind: "refreshRepo",
        payload: { repoId },
      },
    });

    return res.json({ message: "Refresh queued" });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/repos/:id/health
 * 
 * Gets the health score and activity data for a repository.
 * 
 * Path parameters:
 *   - id: number - Repository ID
 * 
 * Returns:
 *   - 200: Health score and activity data
 *   - 400: Invalid repository ID
 *   - 404: Repository not found
 * 
 * The health score is recalculated using the latest stored data.
 */
router.get("/:id/health", async (req, res, next) => {
  try {
    const repoId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(repoId)) {
      return res.status(400).json({ message: "Invalid repository id" });
    }

    const repository = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
        // Get latest activity data for health score calculation
        activities: {
          orderBy: { windowEnd: "desc" },
          take: 1,
        },
      },
    });

    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const activity = repository.activities[0];
    // Recalculate health score with latest data
    const score = computeHealthScore(repository, activity);

    return res.json({
      repositoryId: repository.id,
      healthScore: score,
      refreshedAt: repository.healthRefreshedAt,
      activity,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/repos/cleanup
 * 
 * Manually triggers cleanup of stale repositories.
 * Requires authentication.
 * 
 * Returns:
 *   - 200: Cleanup completed with count of deleted repositories
 *   - 401: Unauthorized (missing/invalid token)
 * 
 * Deletes repositories that haven't been accessed in the TTL period
 * (default: 7 days, configurable via REPO_TTL_DAYS env var).
 * This helps prevent database growth beyond storage limits.
 */
router.post("/cleanup", authMiddleware, async (req, res, next) => {
  try {
    const result = await cleanupStaleRepositories();
    return res.json({
      message: "Cleanup completed",
      deletedCount: result.deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

