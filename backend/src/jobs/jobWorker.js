/**
 * Background job worker for processing repository refresh jobs.
 * 
 * This worker:
 * - Polls the FetchJob queue every 10 seconds (configurable via CRON_SCHEDULE)
 * - Processes queued "refreshRepo" jobs
 * - Fetches fresh repository data and activity metrics from GitHub
 * - Updates health scores and activity data in the database
 * - Handles retries (up to 3 attempts) and error logging
 * 
 * Jobs are queued when:
 * - Users view repository details (if data is stale >12 hours)
 * - Users manually trigger refresh via API
 * 
 * Can run as:
 * - Standalone process: npm run worker
 * - Same process as API server: started from app.js (for free hosting)
 */
import cron from "node-cron";
import dotenv from "dotenv";
import pino from "pino";

import prisma from "../services/prismaClient.js";
import { fetchRepository, fetchRepositoryActivity } from "../services/githubService.js";
import { computeHealthScore, summarizeActivity } from "../services/healthScore.js";

dotenv.config();

// Configure structured logging
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { singleLine: true } }
      : undefined,
});

/**
 * Processes a single job from the queue.
 * 
 * Job lifecycle:
 * 1. Find oldest queued job
 * 2. Mark as "processing" and increment attempts
 * 3. Execute job handler based on job.kind
 * 4. Mark as "completed" on success
 * 5. On failure: retry (requeue) if attempts < 3, else mark "failed"
 */
async function processNextJob() {
  // Get oldest queued job (FIFO)
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
    // Mark job as processing and increment attempt counter
    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: "processing", attempts: { increment: 1 }, lastError: null },
    });

    // Route to appropriate handler based on job type
    if (job.kind === "refreshRepo") {
      await handleRefreshRepo(job);
    } else {
      logger.warn({ jobId: job.id, kind: job.kind }, "Unknown job kind");
    }

    // Mark job as completed
    await prisma.fetchJob.update({
      where: { id: job.id },
      data: { status: "completed" },
    });

    logger.info({ jobId: job.id }, "Job completed");
  } catch (error) {
    logger.error({ err: error, jobId: job.id }, "Job failed");
    // Retry up to 3 times, then mark as failed
    await prisma.fetchJob.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= 3 ? "failed" : "queued", // Retry if < 3 attempts
        lastError: error.message,
      },
    });
  }
}

/**
 * Processes all queued jobs in sequence.
 * 
 * This function processes jobs one at a time until the queue is empty.
 * Called periodically by the cron scheduler (every 10 seconds by default).
 * 
 * Note: Jobs are processed sequentially to avoid overwhelming the GitHub API
 * with too many concurrent requests.
 */
async function processAllQueuedJobs() {
  let processed = 0;
  
  // Log queue size for monitoring
  const queuedCount = await prisma.fetchJob.count({
    where: { status: "queued" },
  });
  
  if (queuedCount > 0) {
    logger.info({ queuedCount }, "Found queued jobs to process");
  }
  
  // Process jobs until queue is empty
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

/**
 * Handles "refreshRepo" job type.
 * 
 * This function:
 * 1. Fetches fresh repository metadata from GitHub (uses ETag for efficiency)
 * 2. Fetches activity data (PRs, issues) from the last 30 days
 * 3. Calculates health score with updated data
 * 4. Updates repository record and activity data in database
 * 
 * Activity data is ALWAYS fetched (even if repo metadata is unchanged)
 * because activity changes frequently and affects health scores.
 * 
 * @param {Object} job - FetchJob record with payload: { repoId: number }
 */
async function handleRefreshRepo(job) {
  const repoId = job.payload.repoId;
  if (!repoId) {
    throw new Error("Job payload missing repoId");
  }

  // Get repository from database
  const repository = await prisma.repository.findUnique({ where: { id: repoId } });
  if (!repository) {
    throw new Error(`Repository ${repoId} not found`);
  }

  // Fetch fresh repository metadata from GitHub
  // Uses ETag to get 304 Not Modified if unchanged (saves API calls)
  const { etag, data: repoData } = await fetchRepository(repository.fullName, {
    etag: repository.etag,
  });

  // ALWAYS fetch activity data (even if repo data is unchanged)
  // Activity data changes frequently and is needed for health score calculation
  logger.info({ repoId, fullName: repository.fullName }, "Fetching activity data");
  const activityRaw = await fetchRepositoryActivity(repository.fullName, {
    since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // Last 30 days
  });

  // Summarize activity data into metrics for health score calculation
  const activitySummary = summarizeActivity({
    pulls: activityRaw.pulls,
    issues: activityRaw.issues,
  });

  // Use existing repo data if GitHub returned 304 Not Modified
  // Otherwise use fresh data from GitHub
  const updatedRepoData = repoData || {
    description: repository.description,
    stars: repository.stars,
    forks: repository.forks,
    openIssues: repository.openIssues,
    defaultBranch: repository.defaultBranch,
    lastCommitAt: repository.lastCommitAt,
    hasGoodFirstIssues: repository.hasGoodFirstIssues,
  };

  // Calculate health score with updated data
  const healthScore = computeHealthScore(
    { ...repository, ...updatedRepoData },
    activitySummary,
  );

  // Check if activity record for this 30-day window already exists
  // (prevents duplicate activity records)
  const existingActivity = await prisma.repoActivity.findFirst({
    where: {
      repoId,
      windowStart: activitySummary.windowStart,
      windowEnd: activitySummary.windowEnd,
    },
  });

  // Prepare database operations (will be executed in a transaction)
  const operations = [
    // Update repository with fresh data and new health score
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
        etag: etag || repository.etag, // Update ETag for next request
        healthScore, // Recalculated health score
        healthRefreshedAt: new Date(), // Track when health was last refreshed
      },
    }),
  ];

  // Create or update activity record for this 30-day window
  if (!existingActivity) {
    // Create new activity record
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
    // Update existing activity record with fresh metrics
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

  // Execute all operations in a single transaction (atomic)
  await prisma.$transaction(operations);

  logger.info(
    { repoId, healthScore, activitySummary },
    "Repository health and activity updated",
  );
}

/**
 * Starts the job worker scheduler.
 * 
 * Sets up a cron job that processes the queue periodically.
 * Can be called from the main app to run worker in the same process
 * (useful for free hosting platforms that only allow one process).
 * 
 * The worker:
 * - Runs every 10 seconds by default (configurable via CRON_SCHEDULE env var)
 * - Processes all queued jobs on startup
 * - Continues processing jobs as they're queued
 * 
 * Schedule format: cron expression (e.g., "*/10 * * * * *" = every 10 seconds)
 */
export function startJobWorker() {
  // Process jobs frequently (every 10 seconds) for responsive updates
  // Can be configured via CRON_SCHEDULE env var for different intervals
  const schedule = process.env.CRON_SCHEDULE || "*/10 * * * * *"; // Every 10 seconds
  logger.info({ schedule }, "Starting job worker cron (runs every 10 seconds)");

  // Schedule periodic job processing
  cron.schedule(schedule, () => {
    processAllQueuedJobs().catch((error) => {
      logger.error({ err: error }, "Failed to process jobs");
    });
  });

  // Process any queued jobs immediately on startup
  logger.info("Processing initial queued jobs...");
  processAllQueuedJobs().catch((error) => {
    logger.error({ err: error }, "Initial job processing failed");
  });
}

// If this file is run directly (npm run worker), start the worker
// Otherwise, it will be started via startJobWorker() from app.js
// This allows the worker to run as a standalone process or within the API server
const isMainModule = process.argv[1] && process.argv[1].endsWith('jobWorker.js');
if (isMainModule) {
  startJobWorker();
}

