import express from 'express';
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset } from '../controllers/assetController';
import { protect, assetManager } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getAssets)
    .post(protect, createAsset);

router.route('/:id')
    .get(protect, getAsset)
    .put(protect, assetManager, updateAsset)
    .delete(protect, assetManager, deleteAsset);

export default router;
