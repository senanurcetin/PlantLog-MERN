import { Response, NextFunction } from 'express';
import LogEntry from '../models/LogEntry';
import Asset from '../models/Asset';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { pickLogUpdate, sanitizeLogCreation } from '../utils/inputPolicy';
import { canEditLog } from '../utils/authorization';
import { statusTransition, LogStatus } from '../utils/logLifecycle';
import { InvalidPayloadError } from '../utils/inputPolicy';

// @desc    Get all log entries (optionally filtered by asset inside query)
// @route   GET /api/logs
// @access  Private
export const getLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { assetId } = req.query;
        if (assetId !== undefined && (typeof assetId !== 'string' || !mongoose.isValidObjectId(assetId))) {
            res.status(400);
            throw new Error('Invalid asset ID');
        }
        const filter = assetId ? { asset: assetId } : {};

        const logs = await LogEntry.find(filter)
            .populate('author', 'name role')
            .populate('asset', 'name serialNumber')
            .populate('statusHistory.changedBy', 'name role')
            .sort({ createdAt: -1 });

        res.status(200).json(logs);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new log entry
// @route   POST /api/logs
// @access  Private
export const createLogEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { assetId, type, title, description, metrics } = sanitizeLogCreation(req.body);

        if (!req.user) {
            res.status(401);
            throw new Error('User not authenticated');
        }

        if (!mongoose.isValidObjectId(assetId)) {
            res.status(400);
            throw new Error('Invalid asset ID');
        }

        // Verify asset exists
        const asset = await Asset.findById(assetId);
        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }
        if (asset.status === 'decommissioned') {
            res.status(409);
            throw new Error('Cannot create new logs for decommissioned equipment');
        }

        const now = new Date();
        const logEntry = await LogEntry.create({
            asset: assetId,
            author: req.user.id,
            type,
            title,
            description,
            status: 'open',
            metrics,
            reportedAt: now,
            statusHistory: [{
                from: null, to: 'open', changedAt: now, changedBy: req.user.id,
            }],
        });

        res.status(201).json(logEntry);
    } catch (error) {
        next(error);
    }
};

// @desc    Update log entry
// @route   PUT /api/logs/:id
// @access  Private
export const updateLogEntry = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            res.status(400);
            throw new Error('Invalid log ID');
        }
        const log = await LogEntry.findById(req.params.id);

        if (!log) {
            res.status(404);
            throw new Error('Log entry not found');
        }

        // Checking if it's the author or admin/supervisor
        if (!canEditLog(req.user?.role, log.author.toString(), req.user?.id)) {
            res.status(403);
            throw new Error('Not authorized to update this log entry');
        }

        // Resolution closes the evidence record. Corrections require a new
        // log rather than silently rewriting a historical title or outcome.
        if (log.status === 'resolved') {
            res.status(409);
            throw new Error('Resolved log entries are immutable; create a new record for corrections');
        }

        const fields = pickLogUpdate(req.body);
        const patch: Record<string, unknown> = { $set: fields, $inc: { __v: 1 } };
        if (fields.status !== undefined) {
            if (typeof fields.status !== 'string') {
                throw new InvalidPayloadError('Status must be a string');
            }
            const timestampField = statusTransition(log.status, fields.status as LogStatus);
            if (timestampField) {
                const changedAt = new Date();
                (patch.$set as Record<string, unknown>)[timestampField] = changedAt;
                patch.$push = {
                    statusHistory: {
                        from: log.status, to: fields.status, changedAt, changedBy: req.user!.id,
                    },
                };
            }
        }

        // Atomic compare-and-set ensures concurrent editors cannot overwrite status
        // transitions or append an event inconsistent with the prior state.
        const updatedLog = await LogEntry.findOneAndUpdate(
            { _id: log._id, __v: log.__v },
            patch,
            { new: true, runValidators: true }
        ).populate('author', 'name role')
            .populate('asset', 'name serialNumber')
            .populate('statusHistory.changedBy', 'name role');

        if (!updatedLog) {
            res.status(409);
            throw new Error('Log was updated by another user; refresh and try again');
        }

        res.status(200).json(updatedLog);
    } catch (error) {
        next(error);
    }
};
