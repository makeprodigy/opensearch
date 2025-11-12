/**
 * Very small in-memory token bucket rate limiter used to shield the public
 * API endpoints from abuse. For production we recommend a distributed store.
 */
const buckets = new Map();

export function makeRateLimiter({ tokensPerInterval = 30, intervalMs = 60_000 }) {
  return function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();

    const bucket = buckets.get(key) ?? { tokens: tokensPerInterval, updatedAt: now };
    const elapsed = now - bucket.updatedAt;

    const refill = Math.floor((elapsed / intervalMs) * tokensPerInterval);
    bucket.tokens = Math.min(tokensPerInterval, bucket.tokens + refill);
    bucket.updatedAt = now;

    if (bucket.tokens <= 0) {
      const retryAfter = Math.ceil(intervalMs / 1000);
      res.set("Retry-After", retryAfter.toString());
      return res.status(429).json({ message: "Rate limit exceeded. Please retry shortly." });
    }

    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return next();
  };
}

