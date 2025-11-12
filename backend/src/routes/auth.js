/**
 * Authentication routes.
 * Handles user signup/login using bcrypt hashed passwords and JWT for sessions.
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../services/prismaClient.js";

const router = Router();
const TOKEN_TTL = "7d";

router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, and password are required" });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
      },
    });

    if (existing) {
      return res.status(409).json({ message: "User with that username or email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

    return res.status(201).json({ user, token });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

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

export default router;

