/**
 * Search route proxies queries to GitHub and persists metadata about discovered repos.
 */
import { Router } from "express";

import prisma from "../services/prismaClient.js";
import { searchRepositories, fetchRepository } from "../services/githubService.js";
import { computeHealthScore } from "../services/healthScore.js";
import { makeRateLimiter } from "../utils/rateLimiter.js";

const router = Router();
const rateLimiter = makeRateLimiter({ tokensPerInterval: 20, intervalMs: 60_000 });

router.get("/", rateLimiter, async (req, res, next) => {
  try {
    const { q, page = 1, perPage = 10, sort, order } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Missing query parameter 'q'" });
    }

    const searchResult = await searchRepositories({
      query: q,
      page: Number.parseInt(page, 10) || 1,
      perPage: Math.min(Number.parseInt(perPage, 10) || 10, 30),
      sort,
      order,
    });

    // Calculate health scores on-the-fly without persisting to database
    const itemsWithHealthScore = searchResult.items.map((item) => {
      const lastCommitAt = item.lastCommitAt ? new Date(item.lastCommitAt) : null;
      const healthScore = computeHealthScore(
        { ...item, lastCommitAt, stars: item.stars ?? 0 },
        null,
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
    if (error.response?.status === 304) {
      return res.json({ totalCount: 0, items: [] });
    }
    return next(error);
  }
});

router.get("/:owner/:repo", async (req, res, next) => {
  try {
    const fullName = `${req.params.owner}/${req.params.repo}`;

    // Check if repo exists in database
    let repository = await prisma.repository.findUnique({
      where: { fullName },
      include: {
        activities: {
          orderBy: { windowEnd: "desc" },
          take: 1,
        },
      },
    });

    // Fetch fresh data from GitHub
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
          etag: fetched.etag,
          healthScore: calculatedHealthScore,
          lastFetchedAt: new Date(),
        },
        include: {
          activities: true,
        },
      });
    } else if (fetched.data) {
      // Update existing repo with fresh data and update lastFetchedAt
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
          etag: fetched.etag,
          lastFetchedAt: new Date(),
        },
        include: {
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      });
    } else {
      // Data not modified (304), just update lastFetchedAt to keep it fresh
      repository = await prisma.repository.update({
        where: { id: repository.id },
        data: {
          lastFetchedAt: new Date(),
        },
        include: {
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      });
    }

    // Queue a refresh job to fetch activity data if needed
    const now = Date.now();
    const refreshThresholdMs = 1000 * 60 * 60 * 12; // 12 hours
    const needsRefresh =
      !repository.healthRefreshedAt ||
      now - repository.healthRefreshedAt.getTime() > refreshThresholdMs;

    if (needsRefresh) {
      // Check if a refresh job is already queued
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

