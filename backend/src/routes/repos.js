/**
 * Repository routes: list stored repositories, refresh health scores, etc.
 */
import { Router } from "express";

import prisma from "../services/prismaClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { computeHealthScore } from "../services/healthScore.js";
import { cleanupStaleRepositories } from "../jobs/cleanupRepos.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, perPage = 12 } = req.query;
    const currentPage = Number.parseInt(page, 10) || 1;
    const pageSize = Math.min(Number.parseInt(perPage, 10) || 12, 50);

    const [total, repositories] = await Promise.all([
      prisma.repository.count(),
      prisma.repository.findMany({
        orderBy: { healthScore: "desc" },
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
        include: {
          activities: {
            orderBy: { windowEnd: "desc" },
            take: 1,
          },
        },
      }),
    ]);

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

router.post("/:id/refresh", authMiddleware, async (req, res, next) => {
  try {
    const repoId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(repoId)) {
      return res.status(400).json({ message: "Invalid repository id" });
    }

    const repository = await prisma.repository.findUnique({ where: { id: repoId } });
    if (!repository) {
      return res.status(404).json({ message: "Repository not found" });
    }

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

router.get("/:id/health", async (req, res, next) => {
  try {
    const repoId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(repoId)) {
      return res.status(400).json({ message: "Invalid repository id" });
    }

    const repository = await prisma.repository.findUnique({
      where: { id: repoId },
      include: {
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

