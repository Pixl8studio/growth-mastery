/**
 * Distributed Cache Service for Web Scraping
 * Uses Vercel KV (Redis) for serverless-compatible caching
 */

import { kv } from "@vercel/kv";
import { logger } from "@/lib/logger";

/**
 * Cache TTL: 24 hours (in seconds for Redis)
 */
export const CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Get cached data if it exists and is not expired
 * Uses Vercel KV for distributed caching across serverless functions
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const cached = await kv.get<T>(key);

        if (cached) {
            logger.info({ key }, "Cache hit");
            return cached;
        }

        logger.debug({ key }, "Cache miss");
        return null;
    } catch (error) {
        logger.error({ error, key }, "Cache read error");
        // Gracefully degrade - return null if cache unavailable
        return null;
    }
}

/**
 * Set data in cache with TTL
 * Data automatically expires after CACHE_TTL_SECONDS
 */
export async function setCache(key: string, data: unknown): Promise<void> {
    try {
        await kv.set(key, data, {
            ex: CACHE_TTL_SECONDS,
        });

        logger.info({ key, ttl: CACHE_TTL_SECONDS }, "Cached data");
    } catch (error) {
        logger.error({ error, key }, "Cache write error");
        // Don't throw - cache failures shouldn't break the application
    }
}

/**
 * Clear cache for a specific key or pattern
 * Note: Pattern matching requires Redis SCAN, which is expensive
 * Prefer clearing specific keys when possible
 */
export async function clearCache(key: string): Promise<void> {
    try {
        await kv.del(key);
        logger.info({ key }, "Cleared cache entry");
    } catch (error) {
        logger.error({ error, key }, "Cache clear error");
    }
}

/**
 * Check if a key exists in cache (without fetching the value)
 */
export async function cacheExists(key: string): Promise<boolean> {
    try {
        const exists = await kv.exists(key);
        return exists === 1;
    } catch (error) {
        logger.error({ error, key }, "Cache exists check error");
        return false;
    }
}

/**
 * Set cache with custom TTL (in seconds)
 */
export async function setCacheWithTTL(
    key: string,
    data: unknown,
    ttlSeconds: number
): Promise<void> {
    try {
        await kv.set(key, data, {
            ex: ttlSeconds,
        });

        logger.info({ key, ttl: ttlSeconds }, "Cached data with custom TTL");
    } catch (error) {
        logger.error({ error, key }, "Cache write error");
    }
}
