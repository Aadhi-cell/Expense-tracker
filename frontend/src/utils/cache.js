/**
 * Lightweight Client-Side Stale-While-Revalidate (SWR) Cache Manager
 * Provides 0ms instant page loads using sessionStorage & memory cache.
 */

const memoryStore = new Map();
const PREFIX = 'et_cache_';

export const getCachedData = (key) => {
  try {
    // 1. Check memory cache first
    if (memoryStore.has(key)) {
      const item = memoryStore.get(key);
      if (Date.now() < item.expiry) {
        return item.data;
      }
      memoryStore.delete(key);
    }

    // 2. Check sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(PREFIX + key);
      if (stored) {
        const item = JSON.parse(stored);
        if (Date.now() < item.expiry) {
          memoryStore.set(key, item); // rehydrate memory
          return item.data;
        }
        window.sessionStorage.removeItem(PREFIX + key);
      }
    }
  } catch (e) {
    console.warn('Cache read error', e);
  }
  return null;
};

export const setCachedData = (key, data, ttlSeconds = 180) => {
  try {
    const payload = {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    };
    memoryStore.set(key, payload);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(PREFIX + key, JSON.stringify(payload));
    }
  } catch (e) {
    console.warn('Cache write error', e);
  }
};

export const invalidateCache = (pattern) => {
  try {
    // Invalidate memory
    for (const key of memoryStore.keys()) {
      if (!pattern || key.includes(pattern)) {
        memoryStore.delete(key);
      }
    }
    // Invalidate sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const fullKey = window.sessionStorage.key(i);
        if (fullKey && fullKey.startsWith(PREFIX)) {
          const rawKey = fullKey.slice(PREFIX.length);
          if (!pattern || rawKey.includes(pattern)) {
            keysToRemove.push(fullKey);
          }
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    }
  } catch (e) {
    console.warn('Cache invalidation error', e);
  }
};

export const clearAllCache = () => {
  memoryStore.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const keysToRemove = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  }
};
