/**
 * Repository cleanup job for storage optimization.
 * 
 * This module handles automatic deletion of stale repositories to prevent
 * database growth beyond storage limits. Repositories that haven't been
 * accessed (lastFetchedAt) within the TTL period are considered stale and
 * are deleted along with their associated activity data (cascade delete).
 * 
 * The cleanup runs:
 * - Immediately on server startup
 * - Periodically at configurable intervals (default: 1 hour)
 * 
 * TTL is configurable via REPO_TTL_DAYS env var (default: 7 days).
 */
import prisma from "../services/prismaClient.js";

// TTL in milliseconds (default: 7 days)
// Repositories older than this are considered stale and will be deleted
const REPO_TTL_MS = Number.parseInt(process.env.REPO_TTL_DAYS || "7", 10) * 24 * 60 * 60 * 1000;

/**
 * Deletes repositories that haven't been fetched/accessed recently.
 * 
 * Repositories are considered stale if:
 * - lastFetchedAt is older than the TTL cutoff date, OR
 * - lastFetchedAt is null (never accessed)
 * 
 * Deletion cascades to related RepoActivity records automatically
 * (defined in Prisma schema).
 * 
 * @returns {Promise<{ deleted: number }>} Count of deleted repositories
 */
export async function cleanupStaleRepositories() {
  // Calculate cutoff date: now minus TTL period
  const cutoffDate = new Date(Date.now() - REPO_TTL_MS);

  try {
    // Delete repositories that are stale
    // Prisma cascade delete will automatically remove associated RepoActivity records
    const result = await prisma.repository.deleteMany({
      where: {
        OR: [
          { lastFetchedAt: { lt: cutoffDate } }, // Older than TTL
          { lastFetchedAt: null }, // Never accessed
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
 * 
 * The scheduler:
 * 1. Runs cleanup immediately on startup
 * 2. Then runs cleanup periodically at the specified interval
 * 
 * This is called from app.js when the server starts.
 * 
 * @param {number} intervalMs - How often to run cleanup in milliseconds (default: 1 hour)
 */
export function startCleanupScheduler(intervalMs = 60 * 60 * 1000) {
  console.log(`[CleanupJob] Starting cleanup scheduler (interval: ${intervalMs}ms, TTL: ${REPO_TTL_MS}ms)`);

  // Run cleanup immediately on startup to clean up any stale repos
  cleanupStaleRepositories().catch((error) => {
    console.error("[CleanupJob] Initial cleanup failed:", error);
  });

  // Schedule periodic cleanup
  setInterval(() => {
    cleanupStaleRepositories().catch((error) => {
      console.error("[CleanupJob] Scheduled cleanup failed:", error);
    });
  }, intervalMs);
}

