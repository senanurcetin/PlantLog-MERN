import { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import AuditEvent from '../models/AuditEvent';
import { AuthRequest } from './authMiddleware';
import { matchAuditedRoute, auditOutcome } from '../utils/auditPolicy';

const objectId = (input: unknown): mongoose.Types.ObjectId | undefined => {
    if (typeof input !== 'string' || !/^[0-9a-f]{24}$/i.test(input)) return undefined;
    return new mongoose.Types.ObjectId(input);
};

export interface AuditResponse extends Response {
    locals: Response['locals'] & { auditActorId?: string; auditResourceId?: string };
}

/**
 * Captures the status after Express has finished its response, including
 * denied authentication and permission failures. Persistence is asynchronous
 * and best-effort; ordinary domain writes and audit writes are NOT atomic.
 * This is diagnostic pre-production evidence, not a non-repudiation ledger.
 */
export const captureAuditTrail = (
    req: AuthRequest, res: AuditResponse, next: NextFunction,
): void => {
    const route = matchAuditedRoute(req.method, req.path);
    if (!route) { next(); return; }

    res.once('finish', () => {
        if (mongoose.connection.readyState !== 1) return;
        const userId = req.user?._id?.toString();
        const actorId = objectId(userId || res.locals.auditActorId);
        const resourceId = objectId(res.locals.auditResourceId || route.pathResourceId);
        // Do not log details from the request, even for failed login attempts.
        void AuditEvent.create({
            action: route.action,
            resourceType: route.resourceType,
            outcome: auditOutcome(res.statusCode),
            statusCode: res.statusCode,
            ...(actorId ? { actorId } : {}),
            ...(resourceId ? { resourceId } : {}),
        }).catch(() => {
            // No raw errors: MongoDB messages could contain sensitive fields.
            console.error('PlantLog local audit event could not be stored');
        });
    });
    next();
};
