import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import AuditEvent from '../models/AuditEvent';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * Supervisor/admin-only audit list, sorted newest first with bounded cursor
 * pagination. No emails, raw payloads, tokens, IPs or user agent data.
 */
export const listAuditEvents = async (
    req: AuthRequest, res: Response, next: NextFunction,
): Promise<void> => {
    try {
        if (Object.keys(req.query).some(key => !['cursor', 'limit'].includes(key))) {
            res.status(400);
            throw new Error('Unsupported audit filter');
        }
        const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50 ||
            (req.query.limit !== undefined &&
                (typeof req.query.limit !== 'string' || !/^[1-9]\d?$/.test(req.query.limit)))) {
            res.status(400);
            throw new Error('Audit limit must be between 1 and 50');
        }
        const cursor = req.query.cursor;
        if (cursor !== undefined &&
            (typeof cursor !== 'string' || !/^[0-9a-f]{24}$/i.test(cursor))) {
            res.status(400);
            throw new Error('Invalid audit cursor');
        }
        const filter = cursor ?
            { _id: { $lt: new mongoose.Types.ObjectId(cursor as string) } } : {};
        const rows = await AuditEvent.find(filter).sort({ _id: -1 }).limit(limit + 1)
            .select('action outcome statusCode actorId resourceType resourceId occurredAt')
            .lean();
        const hasMore = rows.length > limit;
        const items = rows.slice(0, limit);
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({
            items,
            nextCursor: hasMore ? items[items.length - 1]._id.toString() : null,
        });
    } catch (error) {
        next(error);
    }
};
