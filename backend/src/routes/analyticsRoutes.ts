import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getMaintenanceSummary, getEquipmentCases } from '../controllers/analyticsController';

const router = express.Router();
router.get('/maintenance', protect, getMaintenanceSummary);
router.get('/equipment', protect, getEquipmentCases);
export default router;
