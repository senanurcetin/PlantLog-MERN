import { Response, NextFunction } from 'express';
import Asset from '../models/Asset';
import LogEntry from '../models/LogEntry';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { pickAssetUpdate, sanitizeAssetCreation } from '../utils/inputPolicy';
import { canManageAssets } from '../utils/authorization';
import { validateAssetStatusTransition, AssetStatus } from '../utils/assetLifecycle';
import { InvalidPayloadError } from '../utils/inputPolicy';

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const assets = await Asset.find().populate('createdBy', 'name')
            .populate('statusHistory.changedBy', 'name role').sort({ createdAt: -1 });
        res.status(200).json(assets);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Private
export const getAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            res.status(400);
            throw new Error('Invalid asset ID');
        }
        const asset = await Asset.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate('statusHistory.changedBy', 'name role');

        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        res.status(200).json(asset);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private
export const createAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, serialNumber, category, status, location, purchaseDate } =
            sanitizeAssetCreation(req.body);

        if (!req.user) {
            res.status(401);
            throw new Error('User not authenticated');
        }

        const assetExists = await Asset.findOne({ serialNumber });
        if (assetExists) {
            res.status(400);
            throw new Error('Asset with this serial number already exists');
        }

        const createdAt = new Date();
        const asset = await Asset.create({
            name,
            serialNumber,
            category,
            status: status || 'operational',
            location,
            purchaseDate,
            createdBy: req.user.id,
            statusHistory: [{
                from: null, to: 'operational', changedAt: createdAt, changedBy: req.user.id,
            }],
        });

        res.locals.auditResourceId = asset._id.toString();
        res.status(201).json(asset);
    } catch (error) {
        next(error);
    }
};

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private
export const updateAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!canManageAssets(req.user?.role)) {
            res.status(403);
            throw new Error('Supervisor or administrator role required');
        }
        if (!mongoose.isValidObjectId(req.params.id)) {
            res.status(400);
            throw new Error('Invalid asset ID');
        }
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        const fields = pickAssetUpdate(req.body);
        const patch: Record<string, unknown> = { $set: fields, $inc: { __v: 1 } };
        if (fields.status !== undefined) {
            if (typeof fields.status !== 'string' ||
                !['operational', 'maintenance', 'decommissioned'].includes(fields.status)) {
                throw new InvalidPayloadError('Unsupported asset status');
            }
            if (validateAssetStatusTransition(asset.status, fields.status as AssetStatus)) {
                patch.$push = {
                    statusHistory: {
                        from: asset.status,
                        to: fields.status,
                        changedAt: new Date(),
                        changedBy: req.user!.id,
                    },
                };
            }
        }

        // Match the loaded version so concurrent changes cannot generate a
        // transition history inconsistent with the actual previous status.
        const updatedAsset = await Asset.findOneAndUpdate(
            { _id: asset._id, __v: asset.__v },
            patch,
            { new: true, runValidators: true }
        ).populate('createdBy', 'name')
            .populate('statusHistory.changedBy', 'name role');
        if (!updatedAsset) {
            res.status(409);
            throw new Error('Asset changed since it was loaded; refresh and retry');
        }

        res.status(200).json(updatedAsset);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private (Admin or Supervisor)
export const deleteAsset = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!canManageAssets(req.user?.role)) {
            res.status(403);
            throw new Error('Supervisor or administrator role required');
        }
        if (!mongoose.isValidObjectId(req.params.id)) {
            res.status(400);
            throw new Error('Invalid asset ID');
        }
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        // Preserve the maintenance trail; removing an asset with history would orphan logs.
        if (await LogEntry.exists({ asset: asset._id })) {
            res.status(409);
            throw new Error('Asset has maintenance history; decommission it instead of deleting it');
        }

        await asset.deleteOne();

        res.status(200).json({ id: req.params.id, message: 'Asset removed successfully' });
    } catch (error) {
        next(error);
    }
};
