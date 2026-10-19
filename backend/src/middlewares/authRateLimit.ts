import { RequestHandler } from 'express';

interface Bucket { count: number; resetAt: number; }

/**
 * Bounded, process-local defense for the single-node demo.
 * This is NOT a distributed or reverse-proxy aware rate limiter.
 * Use an ingress/distributed quota before external deployment.
 */
export const createLocalAuthRateLimit = (
    maxRequests: number, windowMs: number, now: () => number = Date.now,
): RequestHandler => {
    if (!Number.isInteger(maxRequests) || maxRequests < 1 ||
        !Number.isInteger(windowMs) || windowMs < 1) {
        throw new Error('Invalid authentication rate limit configuration');
    }
    const buckets = new Map<string, Bucket>();
    const maxKeys = 5000;

    return (req, res, next) => {
        // Socket origin is not controlled by caller-provided X-Forwarded-For.
        const key = req.socket.remoteAddress || 'unknown';
        const current = now();
        let bucket = buckets.get(key);

        if (!bucket || current >= bucket.resetAt) {
            // Limit process memory even under attempts from many addresses.
            if (!bucket && buckets.size >= maxKeys) {
                for (const [address, value] of buckets) {
                    if (current >= value.resetAt) buckets.delete(address);
                }
                if (buckets.size >= maxKeys) {
                    const oldest = buckets.keys().next().value;
                    if (oldest !== undefined) buckets.delete(oldest);
                }
            }
            bucket = { count: 0, resetAt: current + windowMs };
            buckets.set(key, bucket);
        }

        if (bucket.count >= maxRequests) {
            res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - current) / 1000))));
            res.status(429).json({ message: 'Too many authentication requests. Try again later.' });
            return;
        }
        bucket.count++;
        next();
    };
};
