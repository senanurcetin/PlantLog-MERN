import express from 'express';
import { getLogs, createLogEntry, updateLogEntry } from '../controllers/logEntryController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getLogs)
    .post(protect, createLogEntry);

router.route('/:id')
    .put(protect, updateLogEntry);

export default router;
