import { Response, NextFunction } from 'express';
import LogEntry from '../models/LogEntry';
import Asset from '../models/Asset';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Get all log entries (optionally filtered by asset inside query)
// @route   GET /api/logs
// @access  Private
export const getLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { assetId } = req.query;
        const filter = assetId ? { asset: assetId } : {};

        const logs = await LogEntry.find(filter)
            .populate('author', 'name email role')
            .populate('asset', 'name serialNumber')
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
        const { assetId, type, title, description, status, metrics } = req.body;

        if (!assetId || !type || !title || !description) {
            res.status(400);
            throw new Error('Please add all required fields');
        }

        if (!req.user) {
            res.status(401);
            throw new Error('User not authenticated');
        }

        // Verify asset exists
        const asset = await Asset.findById(assetId);
        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        const logEntry = await LogEntry.create({
            asset: assetId,
            author: req.user.id,
            type,
            title,
            description,
            status: status || 'open',
            metrics,
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
        const log = await LogEntry.findById(req.params.id);

        if (!log) {
            res.status(404);
            throw new Error('Log entry not found');
        }

        // Checking if it's the author or admin/supervisor
        if (log.author.toString() !== req.user?.id && req.user?.role === 'operator') {
            res.status(403);
            throw new Error('Not authorized to update this log entry');
        }

        const updatedLog = await LogEntry.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedLog);
    } catch (error) {
        next(error);
    }
};
