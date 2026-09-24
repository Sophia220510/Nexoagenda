import "server-only";

interface Bucket { count: number; resetAt: number }
const state = globalThis as typeof globalThis & { __nexoBookingBuckets?: Map<string, Bucket> };
const buckets = state.__nexoBookingBuckets ?? new Map<string, Bucket>();
state.__nexoBookingBuckets = buckets;

export function allowBookingRequest(key: string, limit = 6, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

