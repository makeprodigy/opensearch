/**
 * Example: Fetch repositories with best health scores
 * 
 * Usage: node examples/fetch-top-repos.js
 */
import prisma from "../src/services/prismaClient.js";
import { computeHealthScore } from "../src/services/healthScore.js";

async function fetchTopRepos() {
  console.log("🏆 Fetching Top Repositories by Health Score\n");

  try {
    // Method 1: Get top repos directly from database
    const topRepos = await prisma.repository.findMany({
      orderBy: { healthScore: "desc" },
      take: 10,
      include: {
        activities: {
          orderBy: { windowEnd: "desc" },
          take: 1,
        },
      },
    });

    console.log("📊 Top 10 Repositories:\n");
    topRepos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.fullName}`);
      console.log(`   ⭐ Stars: ${repo.stars.toLocaleString()}`);
      console.log(`   💚 Health Score: ${repo.healthScore}/100`);
      console.log(`   📝 Last Commit: ${repo.lastCommitAt?.toISOString().split("T")[0] || "N/A"}`);
      console.log(`   🔧 Open Issues: ${repo.openIssues}`);

      if (repo.activities[0]) {
        const activity = repo.activities[0];
        console.log(`   📈 Recent Activity:`);
        console.log(`      - PRs Opened: ${activity.prsOpened}`);
        console.log(`      - PRs Merged: ${activity.prsMerged}`);
        console.log(`      - Issues Opened: ${activity.issuesOpened}`);
      }
      console.log();
    });

    // Method 2: Filter by minimum health score
    console.log("\n🎯 High-Quality Repos (Score > 60):\n");
    const highQualityRepos = await prisma.repository.findMany({
      where: {
        healthScore: { gt: 60 },
      },
      orderBy: { healthScore: "desc" },
      take: 5,
    });

    highQualityRepos.forEach((repo) => {
      console.log(`   • ${repo.fullName} - ${repo.healthScore}/100`);
    });

    // Method 3: Find recently active repos
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log("\n🔥 Recently Active Repos (Last 30 days):\n");

    const activeRepos = await prisma.repository.findMany({
      where: {
        lastCommitAt: { gte: thirtyDaysAgo },
      },
      orderBy: { healthScore: "desc" },
      take: 5,
    });

    activeRepos.forEach((repo) => {
      const daysAgo = Math.floor((Date.now() - repo.lastCommitAt.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   • ${repo.fullName}`);
      console.log(`     Last commit: ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`);
    });

    // Method 4: Popular repos with good health
    console.log("\n⭐ Popular & Healthy (Stars > 10,000 & Score > 50):\n");

    const popularHealthy = await prisma.repository.findMany({
      where: {
        AND: [{ stars: { gt: 10000 } }, { healthScore: { gt: 50 } }],
      },
      orderBy: { healthScore: "desc" },
      take: 5,
    });

    popularHealthy.forEach((repo) => {
      console.log(`   • ${repo.fullName}`);
      console.log(`     ⭐ ${repo.stars.toLocaleString()} stars | 💚 ${repo.healthScore}/100 health`);
    });

    // Statistics
    console.log("\n📈 Database Statistics:\n");
    const stats = await prisma.repository.aggregate({
      _avg: { healthScore: true, stars: true },
      _max: { healthScore: true, stars: true },
      _min: { healthScore: true },
      _count: true,
    });

    console.log(`   Total Repositories: ${stats._count}`);
    console.log(`   Average Health Score: ${Math.round(stats._avg.healthScore)}/100`);
    console.log(`   Average Stars: ${Math.round(stats._avg.stars).toLocaleString()}`);
    console.log(`   Highest Health Score: ${stats._max.healthScore}/100`);
    console.log(`   Most Stars: ${stats._max.stars.toLocaleString()}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fetchTopRepos();

