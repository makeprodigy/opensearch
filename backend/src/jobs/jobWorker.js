/**
 * Background worker responsible for processing queued FetchJob records.
 * Uses node-cron to poll the queue periodically and update repository health data.
 */
import cron from "node-cron";
import dotenv from "dotenv";
import pino from "pino";

import prisma from "../services/prismaClient.js";
import { fetchRepository, fetchRepositoryActivity } from "../services/githubService.js";
import { computeHealthScore, summarizeActivity } from "../services/healthScore.js";

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { singleLine: true } }
      : undefined,
});

async function processNextJob() {
  const job = await prisma.fetchJob.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
  });

  if (!job) {
    logger.debug("No queued jobs");
    return;
  }

  logger.info({ jobId: job.id, kind: job.kind }, "Processing job");

  try {
    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: "processing", attempts: { increment: 1 }, lastError: null },
    });

    if (job.kind === "refreshRepo") {
      await handleRefreshRepo(job);
    } else {
      logger.warn({ jobId: job.id, kind: job.kind }, "Unknown job kind");
    }

    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: "completed" },
    });

    logger.info({ jobId: job.id }, "Job completed");
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, "Job failed");
    await prisma.fetchJob.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= 3 ? "failed" : "queued",
        lastError: error.message,
      },
    });
  }
}

async function processAllQueuedJobs() {
  let processed = 0;
  
  // Check how many jobs are queued
  const queuedCount = await prisma.fetchJob.count({
    where: { status: "queued" },
  });
  
  if (queuedCount > 0) {
    logger.info({ queuedCount }, "Found queued jobs to process");
  }
  
  while (true) {
    const job = await prisma.fetchJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });
    
    if (!job) {
      if (processed > 0) {
        logger.info({ count: processed }, "Finished processing queued jobs");
      }
      break;
    }
    
    await processNextJob();
    processed++;
  }
}

async function handleRefreshRepo(job) {
  const repoId = job.payload.repoId;
  if (!repoId) {
    throw new Error("Job payload missing repoId");
  }

  const repository = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repository) {
    throw new Error(`Repository ${repoId} not found`);
  }

  // Fetch repo data from GitHub
  const { etag, data: repoData } = await fetchRepository(repository.fullName, {
    etag: repository.etag,
  });

  // ALWAYS fetch activity data (even if repo data is unchanged)
  logger.info({ repoId, fullName: repository.fullName }, "Fetching activity data");
  const activityRaw = await fetchRepositoryActivity(repository.fullName, {
    since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  });

  const activitySummary = summarizeActivity({
    pulls: activityRaw.pulls,
    issues: activityRaw.issues,
  });

  // Use existing repo data if not modified (304 response)
  const updatedRepoData = repoData || {
    description: repository.description,
    stars: repository.stars,
    forks: repository.forks,
    openIssues: repository.openIssues,
    defaultBranch: repository.defaultBranch,
    lastCommitAt: repository.lastCommitAt,
    hasGoodFirstIssues: repository.hasGoodFirstIssues,
  };

  const healthScore = computeHealthScore(
    { ...repository, ...updatedRepoData },
    activitySummary,
  );

  // Check if activity for this time window already exists
  const existingActivity = await prisma.repoActivity.findFirst({
    where: {
      repoId,
      windowStart: activitySummary.windowStart,
      windowEnd: activitySummary.windowEnd,
    },
  });

  const operations = [
    prisma.repository.update({
      where: { id: repoId },
      data: {
        description: updatedRepoData.description,
        stars: updatedRepoData.stars,
        forks: updatedRepoData.forks,
        openIssues: updatedRepoData.openIssues,
        defaultBranch: updatedRepoData.defaultBranch,
        lastCommitAt: updatedRepoData.lastCommitAt ? new Date(updatedRepoData.lastCommitAt) : null,
        hasGoodFirstIssues: updatedRepoData.hasGoodFirstIssues,
        etag: etag || repository.etag,
        healthScore,
        healthRefreshedAt: new Date(),
      },
    }),
  ];

  // Only create activity if it doesn't exist yet
  if (!existingActivity) {
    operations.push(
      prisma.repoActivity.create({
        data: {
          repoId,
          windowStart: activitySummary.windowStart,
          windowEnd: activitySummary.windowEnd,
          prsMerged: activitySummary.prsMerged,
          prsOpened: activitySummary.prsOpened,
          issuesOpened: activitySummary.issuesOpened,
          issuesComment: activitySummary.issuesComment,
          meanMergeDays: activitySummary.meanMergeDays,
        },
      }),
    );
  } else {
    // Update existing activity
    operations.push(
      prisma.repoActivity.update({
        where: { id: existingActivity.id },
        data: {
          prsMerged: activitySummary.prsMerged,
          prsOpened: activitySummary.prsOpened,
          issuesOpened: activitySummary.issuesOpened,
          issuesComment: activitySummary.issuesComment,
          meanMergeDays: activitySummary.meanMergeDays,
        },
      }),
    );
  }

  await prisma.$transaction(operations);

  logger.info(
    { repoId, healthScore, activitySummary },
    "Repository health and activity updated",
  );
}

// Process jobs more frequently (every 10 seconds instead of every 5 minutes)
const schedule = process.env.CRON_SCHEDULE || "*/10 * * * * *"; // Every 10 seconds
logger.info({ schedule }, "Starting job worker cron (runs every 10 seconds)");

cron.schedule(schedule, () => {
  processAllQueuedJobs().catch((error) => {
    logger.error({ err: error }, "Failed to process jobs");
  });
});

// Process immediately on startup
logger.info("Processing initial queued jobs...");
processAllQueuedJobs().catch((error) => {
  logger.error({ err: error }, "Initial job processing failed");
});

