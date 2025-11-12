/**
 * Cleanup job to remove stale repositories from the database.
 * Repos that haven't been accessed in the TTL period are deleted to prevent
 * database growth beyond storage limits.
 */
import prisma from "../services/prismaClient.js";

// TTL in milliseconds (default: 7 days)
const REPO_TTL_MS = Number.parseInt(process.env.REPO_TTL_DAYS || "7", 10) * 24 * 60 * 60 * 1000;

/**
 * Deletes repositories that haven't been fetched/accessed recently.
 * @returns {Promise<{ deleted: number }>}
 */
export async function cleanupStaleRepositories() {
  const cutoffDate = new Date(Date.now() - REPO_TTL_MS);

  try {
    const result = await prisma.repository.deleteMany({
      where: {
        OR: [
          { lastFetchedAt: { lt: cutoffDate } },
          { lastFetchedAt: null },
        ],
      },
    });

    console.log(`[CleanupJob] Deleted ${result.count} stale repositories older than ${new Date(cutoffDate).toISOString()}`);

    return { deleted: result.count };
  } catch (error) {
    console.error("[CleanupJob] Error cleaning up repositories:", error);
    throw error;
  }
}

/**
 * Starts a periodic cleanup job that runs at the specified interval.
 * @param {number} intervalMs - How often to run cleanup (default: 1 hour)
 */
export function startCleanupScheduler(intervalMs = 60 * 60 * 1000) {
  console.log(`[CleanupJob] Starting cleanup scheduler (interval: ${intervalMs}ms, TTL: ${REPO_TTL_MS}ms)`);

  // Run immediately on start
  cleanupStaleRepositories().catch((error) => {
    console.error("[CleanupJob] Initial cleanup failed:", error);
  });

  // Then run periodically
  setInterval(() => {
    cleanupStaleRepositories().catch((error) => {
      console.error("[CleanupJob] Scheduled cleanup failed:", error);
    });
  }, intervalMs);
}

