import { Request, RequestHandler } from 'express';
import mongoose from 'mongoose';
import AuthRateLimit from '../models/AuthRateLimit';

interface Bucket { count: number; resetAt: number; }

const validate = (maxRequests: number, windowMs: number): void => {
    if (!Number.isInteger(maxRequests) || maxRequests < 1 ||
        !Number.isInteger(windowMs) || windowMs < 1) {
        throw new Error('Invalid authentication rate limit configuration');
    }
};

/**
 * Client address used as the limiter key. With no trusted proxy configured
 * (the default), Express returns the socket address for `req.ip` and ignores
 * X-Forwarded-For; with `TRUST_PROXY_HOPS` set, Express resolves the client
 * from that many trusted hops (see app.ts).
 */
export const clientKey = (req: Request): string =>
    String(req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 64);

const reject = (res: Parameters<RequestHandler>[1], resetAt: number, current: number): void => {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt - current) / 1000))));
    res.status(429).json({ message: 'Too many authentication requests. Try again later.' });
};

/**
 * Bounded, process-local limiter. Used by tests and as the fallback while
 * MongoDB is not connected; it does not share counts between instances.
 */
export const createLocalAuthRateLimit = (
    maxRequests: number, windowMs: number, now: () => number = Date.now,
): RequestHandler => {
    validate(maxRequests, windowMs);
    const buckets = new Map<string, Bucket>();
    const maxKeys = 5000;

    return (req, res, next) => {
        // Socket origin is not controlled by caller-provided X-Forwarded-For.
        const key = clientKey(req);
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
            reject(res, bucket.resetAt, current);
            return;
        }
        bucket.count++;
        next();
    };
};

/** One atomic "count this attempt" step against a store shared by every API instance. */
export interface RateLimitStore {
    hit(key: string, windowMs: number, now: number): Promise<Bucket>;
}

/**
 * MongoDB store: a single atomic update either starts a new window (count 1)
 * or increments the current one, so concurrent instances cannot both slip
 * past the limit. Documents expire through the TTL index on `resetAt`.
 */
export const mongoRateLimitStore: RateLimitStore = {
    async hit(key, windowMs, now) {
        const current = new Date(now);
        const expired = { $or: [{ $not: ['$resetAt'] }, { $lte: ['$resetAt', current] }] };
        const doc = await AuthRateLimit.findOneAndUpdate(
            { key },
            [{
                $set: {
                    key,
                    count: { $cond: [expired, 1, { $add: ['$count', 1] }] },
                    resetAt: { $cond: [expired, new Date(now + windowMs), '$resetAt'] },
                },
            }],
            { upsert: true, new: true, lean: true },
        ).exec();
        if (!doc) throw new Error('rate limit store returned no document');
        return { count: doc.count, resetAt: new Date(doc.resetAt).getTime() };
    },
};

const mongoConnected = (): boolean => mongoose.connection.readyState === 1;

/**
 * Shared limiter for login and registration. Counts live in the shared store
 * while it is reachable; before the database is connected (or if the store
 * fails) the request falls back to the process-local limiter, so the demo
 * never fails open to unlimited attempts and never fails closed for all users.
 */
export const createSharedAuthRateLimit = (
    scope: string, maxRequests: number, windowMs: number,
    options: { store?: RateLimitStore; useStore?: () => boolean; now?: () => number } = {},
): RequestHandler => {
    validate(maxRequests, windowMs);
    if (!/^[a-z][a-z0-9_-]{0,30}$/.test(scope)) throw new Error('Invalid rate limit scope');
    const store = options.store ?? mongoRateLimitStore;
    const useStore = options.useStore ?? mongoConnected;
    const now = options.now ?? Date.now;
    const local = createLocalAuthRateLimit(maxRequests, windowMs, now);

    return (req, res, next) => {
        if (!useStore()) {
            local(req, res, next);
            return;
        }
        const current = now();
        store.hit(`${scope}:${clientKey(req)}`, windowMs, current).then((bucket) => {
            if (bucket.count > maxRequests) {
                reject(res, bucket.resetAt, current);
                return;
            }
            next();
        }, () => local(req, res, next));
    };
};
