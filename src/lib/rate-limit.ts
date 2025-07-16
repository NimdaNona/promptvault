import { NextRequest } from 'next/server';

// Simple in-memory rate limiter
// For production, consider using Redis or a dedicated rate limiting service
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
}

export function rateLimit(config: RateLimitConfig = { windowMs: 60000, max: 10 }) {
  return async (request: NextRequest, identifier?: string) => {
    const id = identifier || request.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    
    const userLimit = rateLimitMap.get(id);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Create new window
      rateLimitMap.set(id, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { success: true, remaining: config.max - 1 };
    }
    
    if (userLimit.count >= config.max) {
      const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
      return { 
        success: false, 
        remaining: 0, 
        retryAfter,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      };
    }
    
    // Increment counter
    userLimit.count++;
    rateLimitMap.set(id, userLimit);
    
    return { success: true, remaining: config.max - userLimit.count };
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Specific rate limiters for different endpoints
export const apiRateLimit = rateLimit({ windowMs: 60000, max: 60 }); // 60 requests per minute
export const authRateLimit = rateLimit({ windowMs: 300000, max: 5 }); // 5 requests per 5 minutes
export const aiRateLimit = rateLimit({ windowMs: 60000, max: 10 }); // 10 AI requests per minute