import { Response, NextFunction } from 'express';
import LogEntry from '../models/LogEntry';
import Asset from '../models/Asset';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { pickLogUpdate } from '../utils/inputPolicy';
import { canEditLog } from '../utils/authorization';

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

        const fields = pickLogUpdate(req.body);
        const updatedLog = await LogEntry.findByIdAndUpdate(
            req.params.id,
            { $set: fields },
            { new: true, runValidators: true }
        );

        res.status(200).json(updatedLog);
    } catch (error) {
        next(error);
    }
};
