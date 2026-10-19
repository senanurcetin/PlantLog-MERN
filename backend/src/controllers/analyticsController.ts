import { Response, NextFunction } from 'express';
import LogEntry from '../models/LogEntry';
import { AuthRequest } from '../middlewares/authMiddleware';
import { InvalidPayloadError } from '../utils/inputPolicy';
import { summarizeMaintenance } from '../utils/maintenanceAnalytics';

// GET /api/analytics/maintenance?days=30
// Authenticated cohort statistics. Uses report-to-resolution time, never MTTR/MTBF.
export const getMaintenanceSummary = async (
    req: AuthRequest, res: Response, next: NextFunction,
): Promise<void> => {
    try {
        const raw = req.query.days;
        const days = raw === undefined ? 30 : (
            typeof raw === 'string' && /^(?:[1-9]\d{0,2})$/.test(raw) ? Number(raw) : NaN
        );
        if (!Number.isInteger(days) || days < 1 || days > 365) {
            throw new InvalidPayloadError('days must be an integer from 1 through 365');
        }
        const now = new Date();
        const from = new Date(now.getTime() - days * 86400000);
        const records = await LogEntry.find({
            type: { $in: ['incident', 'maintenance'] },
            createdAt: { $gte: from, $lte: now },
        }).select('type status createdAt reportedAt resolvedAt statusHistory').lean();
        res.status(200).json(summarizeMaintenance(records, days, now));
    } catch (error) {
        next(error);
    }
};
