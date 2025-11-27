/**
 * JWT authentication middleware.
 * 
 * Verifies JWT tokens from the Authorization header and attaches user information
 * to the request object. Used to protect routes that require authentication.
 * 
 * Usage:
 *   router.post('/protected', authMiddleware, handler);
 * 
 * After successful verification, req.user.id contains the user ID from the token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  // Check for Authorization header with Bearer scheme
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  // Extract token from "Bearer <token>"
  const token = header.slice("Bearer ".length);

  try {
    // Verify and decode JWT token
    // Token should have been signed with user ID in 'sub' claim
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user ID to request for use in route handlers
    req.user = { id: payload.sub };
    return next();
  } catch (error) {
    // Token invalid, expired, or malformed
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

