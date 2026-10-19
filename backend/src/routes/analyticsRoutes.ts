import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getMaintenanceSummary } from '../controllers/analyticsController';

const router = express.Router();
router.get('/maintenance', protect, getMaintenanceSummary);
export default router;
