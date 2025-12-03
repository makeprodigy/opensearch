/**
 * Authentication routes for user registration, login, and account management.
 * 
 * This module handles:
 * - User signup with password hashing (bcrypt, 12 rounds)
 * - User login with credential verification
 * - JWT token generation for authenticated sessions
 * - Account deletion with password verification
 * 
 * All passwords are hashed before storage, and JWT tokens are used
 * for stateless authentication across the application.
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../services/prismaClient.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();
// JWT token expiration time (7 days)
const TOKEN_TTL = "7d";

/**
 * POST /api/auth/signup
 * 
 * Creates a new user account with hashed password.
 * 
 * Request body:
 *   - username: string (will be lowercased)
 *   - email: string (will be lowercased)
 *   - password: string (will be hashed with bcrypt, 12 rounds)
 * 
 * Returns:
 *   - 201: User created successfully with JWT token
 *   - 400: Missing required fields
 *   - 409: Username or email already exists
 */
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, and password are required" });
    }

    // Check if user already exists (case-insensitive)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
      },
    });

    if (existing) {
      return res.status(409).json({ message: "User with that username or email already exists" });
    }

    // Hash password with bcrypt (12 rounds = good balance of security and performance)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in database (lowercase username/email for consistency)
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
      },
      // Exclude password hash from response
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate JWT token with user ID in 'sub' claim
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/auth/login
 * 
 * Authenticates a user and returns a JWT token.
 * 
 * Request body:
 *   - email: string
 *   - password: string
 * 
 * Returns:
 *   - 200: Login successful with user data and JWT token
 *   - 400: Missing email or password
 *   - 401: Invalid credentials (user not found or password mismatch)
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Return generic error to prevent user enumeration
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password against stored hash
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    // Return generic error for security (don't reveal if email exists)
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token with user ID
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

    // Return user data (excluding password hash) and token
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/auth/account
 * 
 * Permanently deletes the authenticated user's account.
 * Requires password verification for security.
 * 
 * Request body:
 *   - password: string (required for verification)
 * 
 * Returns:
 *   - 200: Account deleted successfully
 *   - 400: Missing password
 *   - 401: Unauthorized (missing/invalid token) or incorrect password
 *   - 404: User not found
 * 
 * Note: This action is irreversible. All user data will be permanently deleted.
 */
router.delete("/account", authMiddleware, async (req, res, next) => {
  try {
    const { password } = req.body ?? {};

    // Password is required for account deletion (security measure)
    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }

    // Get the authenticated user's ID from the middleware
    const userId = req.user.id;

    // Fetch user from database to verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password before deletion
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    // Delete the user account (this is permanent!)
    await prisma.user.delete({
      where: { id: userId },
    });

    return res.json({
      message: "Account deleted successfully",
      deletedUserId: userId,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

