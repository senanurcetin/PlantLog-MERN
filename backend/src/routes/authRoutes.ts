import express from 'express';
import { registerUser, loginUser, getMe, logoutUser } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { createLocalAuthRateLimit } from '../middlewares/authRateLimit';

const router = express.Router();

// Per-process safeguards for local demos, not distributed production quotas.
router.post('/register', createLocalAuthRateLimit(10, 10 * 60 * 1000), registerUser);
router.post('/login', createLocalAuthRateLimit(30, 10 * 60 * 1000), loginUser);
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);

export default router;
