/**
 * Token bucket rate limiter implementation for API protection.
 * 
 * This is a simple in-memory rate limiter that uses the token bucket algorithm
 * to prevent API abuse. Each IP address gets a bucket of tokens that refill
 * over time. Requests consume tokens, and if the bucket is empty, requests
 * are rejected with a 429 status.
 * 
 * Note: This implementation stores buckets in memory, so it won't work across
 * multiple server instances. For production with multiple servers, use a
 * distributed store like Redis.
 * 
 * @example
 * const limiter = makeRateLimiter({ tokensPerInterval: 20, intervalMs: 60000 });
 * app.use('/api/search', limiter);
 */
const buckets = new Map();

/**
 * Creates a rate limiter middleware function.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.tokensPerInterval - Maximum tokens per interval (default: 30)
 * @param {number} options.intervalMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns {Function} Express middleware function
 */
export function makeRateLimiter({ tokensPerInterval = 30, intervalMs = 60_000 }) {
  return function rateLimiter(req, res, next) {
    // Use client IP as the rate limit key
    const key = req.ip;
    const now = Date.now();

    // Get or create bucket for this IP
    // If bucket doesn't exist, initialize with full tokens
    const bucket = buckets.get(key) ?? { tokens: tokensPerInterval, updatedAt: now };
    
    // Calculate time elapsed since last update
    const elapsed = now - bucket.updatedAt;

    // Refill tokens based on elapsed time (proportional refill)
    // Example: If 30 seconds passed in a 60-second window, refill 50% of tokens
    const refill = Math.floor((elapsed / intervalMs) * tokensPerInterval);
    bucket.tokens = Math.min(tokensPerInterval, bucket.tokens + refill);
    bucket.updatedAt = now;

    // Check if bucket is empty (rate limit exceeded)
    if (bucket.tokens <= 0) {
      // Set Retry-After header indicating when client can retry (in seconds)
      const retryAfter = Math.ceil(intervalMs / 1000);
      res.set("Retry-After", retryAfter.toString());
      return res.status(429).json({ message: "Rate limit exceeded. Please retry shortly." });
    }

    // Consume one token for this request
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return next();
  };
}

