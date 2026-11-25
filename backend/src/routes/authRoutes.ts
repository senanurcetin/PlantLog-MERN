import express from 'express';
import { registerUser, loginUser, getMe, logoutUser } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { createSharedAuthRateLimit } from '../middlewares/authRateLimit';

const router = express.Router();

// Counts are shared through MongoDB across API instances (#59); before the
// database is connected each process falls back to its own bounded limiter.
router.post('/register', createSharedAuthRateLimit('register', 10, 10 * 60 * 1000), registerUser);
router.post('/login', createSharedAuthRateLimit('login', 30, 10 * 60 * 1000), loginUser);
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);

export default router;
