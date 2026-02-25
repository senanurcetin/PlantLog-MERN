import { Response, NextFunction } from 'express';
import Asset from '../models/Asset';
import { AuthRequest } from '../middlewares/authMiddleware';

// @desc    Get all assets
// @route   GET /api/assets
// @access  Private
export const getAssets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const assets = await Asset.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
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
        const asset = await Asset.findById(req.params.id).populate('createdBy', 'name email');

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
        const { name, serialNumber, category, status, location, purchaseDate } = req.body;

        if (!name || !serialNumber || !category || !location) {
            res.status(400);
            throw new Error('Please add all required fields');
        }

        if (!req.user) {
            res.status(401);
            throw new Error('User not authenticated');
        }

        const assetExists = await Asset.findOne({ serialNumber });
        if (assetExists) {
            res.status(400);
            throw new Error('Asset with this serial number already exists');
        }

        const asset = await Asset.create({
            name,
            serialNumber,
            category,
            status: status || 'operational',
            location,
            purchaseDate,
            createdBy: req.user.id,
        });

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
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        const updatedAsset = await Asset.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

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
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            res.status(404);
            throw new Error('Asset not found');
        }

        if (req.user?.role !== 'admin' && req.user?.role !== 'supervisor') {
            res.status(403);
            throw new Error('Not authorized to delete assets');
        }

        await asset.deleteOne();

        res.status(200).json({ id: req.params.id, message: 'Asset removed successfully' });
    } catch (error) {
        next(error);
    }
};
