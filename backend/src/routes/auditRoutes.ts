import { Router } from 'express';
import { protect, assetManager } from '../middlewares/authMiddleware';
import { listAuditEvents } from '../controllers/auditController';

const router = Router();
// No create/update/delete API. Access is limited to trusted maintenance roles.
router.get('/', protect, assetManager, listAuditEvents);
export default router;
