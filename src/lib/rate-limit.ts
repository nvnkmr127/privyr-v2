import Redis from "ioredis";

// Reuse the existing Redis connection structure
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export class RateLimiter {
  static async checkLimit(key: string, limit: number, windowSeconds: number): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
    const redisKey = `ratelimit:${key}:${currentWindow}`;

    // Increment the count for the current window
    const count = await redis.incr(redisKey);
    
    // Set expiration on the key if it's the first increment
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const resetTime = (currentWindow + 1) * windowSeconds * 1000;

    return {
      success: count <= limit,
      limit,
      remaining,
      reset: resetTime,
    };
  }
}
