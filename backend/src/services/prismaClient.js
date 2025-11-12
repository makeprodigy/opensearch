/**
 * Singleton Prisma client used across the backend.
 * Ensures we reuse a single connection pool when imported in server or worker processes.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

