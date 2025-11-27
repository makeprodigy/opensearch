/**
 * Prisma database client singleton.
 * 
 * This module exports a single PrismaClient instance that's reused across
 * the entire backend application. Prisma manages connection pooling internally,
 * so using a singleton ensures efficient database connection reuse.
 * 
 * Import this module wherever database access is needed:
 *   import prisma from './services/prismaClient.js';
 * 
 * Note: In production, Prisma automatically handles connection pooling based
 * on the DATABASE_URL connection string.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

