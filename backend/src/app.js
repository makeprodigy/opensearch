/**
 * Entry point for the GoodFirstFinder backend HTTP server.
 * Wires together Express middleware, API routes, and health checks.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pino from "pino";

import authRoutes from "./routes/auth.js";
import searchRoutes from "./routes/search.js";
import repoRoutes from "./routes/repos.js";
import { startCleanupScheduler } from "./jobs/cleanupRepos.js";
import { startJobWorker } from "./jobs/jobWorker.js";

dotenv.config();

const app = express();

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { singleLine: true } }
      : undefined,
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()) ?? "*",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/repos", repoRoutes);

app.use((err, _req, res, _next) => {
  logger.error({ err }, "Unhandled error in request pipeline");
  res.status(err.statusCode ?? 500).json({
    message: err.message ?? "Internal server error",
  });
});

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
app.listen(port, () => {
  logger.info({ port }, "Server running");
  
  // Start the cleanup scheduler to remove stale repositories
  // Runs every hour by default, configurable via CLEANUP_INTERVAL_HOURS env var
  const cleanupIntervalHours = Number.parseInt(process.env.CLEANUP_INTERVAL_HOURS ?? "1", 10);
  startCleanupScheduler(cleanupIntervalHours * 60 * 60 * 1000);
  
  // Start the job worker in the same process (for free deployment on Render)
  // Set ENABLE_WORKER=false to disable if deploying worker separately
  if (process.env.ENABLE_WORKER !== "false") {
    logger.info("Starting job worker in the same process...");
    startJobWorker();
  }
});

export default app;

