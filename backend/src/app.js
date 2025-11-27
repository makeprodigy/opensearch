/**
 * Entry point for the GoodFirstFinder backend HTTP server.
 * 
 * This module:
 * - Sets up Express server with middleware (CORS, JSON parsing, error handling)
 * - Registers API routes (auth, search, repos)
 * - Starts background workers (cleanup scheduler, job worker)
 * - Configures structured logging with Pino
 * 
 * The server can run the job worker in the same process (for free hosting)
 * or as a separate process (for production scalability).
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

// Configure structured logging with Pino
// In development, uses pino-pretty for readable console output
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { singleLine: true } }
      : undefined,
});

// CORS middleware - allows frontend to make requests
// Supports multiple origins (comma-separated) or "*" for all origins
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",").map((value) => value.trim()) ?? "*",
    credentials: true,
  }),
);

// JSON body parser middleware
app.use(express.json());

// Health check endpoint (for monitoring/deployment checks)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API route handlers
app.use("/api/auth", authRoutes);    // Authentication (signup, login)
app.use("/api/search", searchRoutes); // GitHub search proxy
app.use("/api/repos", repoRoutes);   // Repository management

// Global error handler - catches all unhandled errors
app.use((err, _req, res, _next) => {
  logger.error({ err }, "Unhandled error in request pipeline");
  res.status(err.statusCode ?? 500).json({
    message: err.message ?? "Internal server error",
  });
});

// Start HTTP server
const port = Number.parseInt(process.env.PORT ?? "4000", 10);
app.listen(port, () => {
  logger.info({ port }, "Server running");
  
  // Start the cleanup scheduler to remove stale repositories
  // Runs every hour by default, configurable via CLEANUP_INTERVAL_HOURS env var
  // Deletes repositories that haven't been accessed in the TTL period (default: 7 days)
  const cleanupIntervalHours = Number.parseInt(process.env.CLEANUP_INTERVAL_HOURS ?? "1", 10);
  startCleanupScheduler(cleanupIntervalHours * 60 * 60 * 1000);
  
  // Start the job worker in the same process (for free deployment on Render/Railway)
  // The worker processes queued jobs to refresh repository data and health scores
  // Set ENABLE_WORKER=false to disable if deploying worker as separate process
  if (process.env.ENABLE_WORKER !== "false") {
    logger.info("Starting job worker in the same process...");
    startJobWorker();
  }
});

export default app;

