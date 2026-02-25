import express from 'express';
import { getAssets, getAsset, createAsset, updateAsset, deleteAsset } from '../controllers/assetController';
import { protect, admin } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getAssets)
    .post(protect, createAsset);

router.route('/:id')
    .get(protect, getAsset)
    .put(protect, updateAsset)
    .delete(protect, deleteAsset);

export default router;
