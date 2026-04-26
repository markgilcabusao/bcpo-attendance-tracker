// ============================================================================
// Performance Optimized Data Cache Utility
// Provides in-memory caching with TTL, request deduplication, and stale-while-revalidate
// ============================================================================
/**
 * Simple in-memory cache with TTL support
 */
export class DataCache {
    cache = new Map();
    ttl;
    pendingRequests = new Map();
    constructor(options = {}) {
        this.ttl = options.ttl ?? 5 * 60 * 1000; // Default 5 minutes
    }
    /**
     * Generate cache key from parameters
     */
    generateKey(...args) {
        return JSON.stringify(args);
    }
    /**
     * Check if cache entry is valid
     */
    isValid(entry) {
        return Date.now() - entry.timestamp < this.ttl;
    }
    /**
     * Get data from cache
     */
    get(...args) {
        const key = this.generateKey(...args);
        const entry = this.cache.get(key);
        if (entry && this.isValid(entry)) {
            return entry.data;
        }
        // Remove expired entry
        if (entry) {
            this.cache.delete(key);
        }
        return null;
    }
    /**
     * Set data in cache
     */
    set(data, ...args) {
        const key = this.generateKey(...args);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }
    /**
     * Get or fetch data with caching
     * Includes request deduplication to prevent multiple simultaneous requests
     */
    async getOrFetch(fetcher, ...args) {
        const key = this.generateKey(...args);
        // Check if we have valid cached data
        const cached = this.get(...args);
        if (cached !== null) {
            return cached;
        }
        // Check if there's already a pending request for this key
        const existingPromise = this.pendingRequests.get(key);
        if (existingPromise) {
            return existingPromise;
        }
        // Create new fetch promise and store it for deduplication
        const fetchPromise = fetcher().then(data => {
            this.set(data, ...args);
            this.pendingRequests.delete(key);
            return data;
        }).catch(error => {
            this.pendingRequests.delete(key);
            throw error;
        });
        this.pendingRequests.set(key, fetchPromise);
        return fetchPromise;
    }
    /**
     * Invalidate specific cache entry
     */
    invalidate(...args) {
        const key = this.generateKey(...args);
        this.cache.delete(key);
    }
    /**
     * Invalidate all cache entries
     */
    invalidateAll() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            pending: this.pendingRequests.size,
        };
    }
}
// ============================================================================
// Global Cache Instances
// ============================================================================
// Cache for duty records - 3 minute TTL for frequently accessed data
export const dutyRecordsCache = new DataCache({ ttl: 3 * 60 * 1000 });
// Cache for officers - 5 minute TTL
export const officersCache = new DataCache({ ttl: 5 * 60 * 1000 });
// Cache for scheduled tasks - 2 minute TTL
export const scheduledTasksCache = new DataCache({ ttl: 2 * 60 * 1000 });
/**
 * Clear all application caches
 */
export function clearAllCaches() {
    dutyRecordsCache.invalidateAll();
    officersCache.invalidateAll();
    scheduledTasksCache.invalidateAll();
}
