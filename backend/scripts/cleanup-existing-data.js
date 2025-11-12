#!/usr/bin/env node
/**
 * One-time script to clean up existing repository data.
 * Run this after deploying the storage optimization changes.
 * 
 * Usage: node scripts/cleanup-existing-data.js
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupExistingData() {
  console.log("Starting cleanup of existing repository data...\n");

  // Get current stats
  const totalRepos = await prisma.repository.count();
  const totalActivities = await prisma.repoActivity.count();

  console.log(`Current database state:`);
  console.log(`  - Repositories: ${totalRepos}`);
  console.log(`  - Activities: ${totalActivities}\n`);

  // Find repositories with no lastFetchedAt (old data)
  const reposWithoutTimestamp = await prisma.repository.count({
    where: { lastFetchedAt: null },
  });

  console.log(`Found ${reposWithoutTimestamp} repositories without lastFetchedAt timestamp`);

  if (reposWithoutTimestamp > 0) {
    console.log("Setting current timestamp for existing repositories...");
    
    // Update all existing repos to have lastFetchedAt = now
    // This gives them a 7-day grace period before cleanup
    const updated = await prisma.repository.updateMany({
      where: { lastFetchedAt: null },
      data: { lastFetchedAt: new Date() },
    });

    console.log(`✓ Updated ${updated.count} repositories\n`);
  }

  // Optionally, delete really old repos (older than 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const oldRepos = await prisma.repository.count({
    where: {
      updatedAt: { lt: thirtyDaysAgo },
    },
  });

  if (oldRepos > 0) {
    console.log(`\nFound ${oldRepos} repositories older than 30 days.`);
    console.log("Do you want to delete them? (y/n)");
    
    // For automated scripts, set environment variable SKIP_PROMPT=true
    if (process.env.SKIP_PROMPT === "true") {
      console.log("Skipping deletion (SKIP_PROMPT=true)");
    } else {
      console.log("Run with SKIP_PROMPT=true to skip this prompt");
      console.log("Exiting without deletion. Run cleanup manually via: POST /api/repos/cleanup");
    }
  }

  // Final stats
  const finalRepos = await prisma.repository.count();
  const finalActivities = await prisma.repoActivity.count();

  console.log(`\nFinal database state:`);
  console.log(`  - Repositories: ${finalRepos}`);
  console.log(`  - Activities: ${finalActivities}`);
  console.log(`\n✓ Cleanup complete!`);
  console.log(`\nThe automatic cleanup job will now maintain database size.`);
  console.log(`Repositories not accessed for ${process.env.REPO_TTL_DAYS || 7} days will be removed.`);

  await prisma.$disconnect();
}

cleanupExistingData().catch((error) => {
  console.error("Error during cleanup:", error);
  process.exit(1);
});

