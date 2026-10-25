import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { evaluateReadiness, isDraining } from '../utils/readiness';

const router = Router();

const noCache = (_req: Request, res: Response): void => {
    res.setHeader('Cache-Control', 'no-store');
};

// Liveness deliberately does not depend on MongoDB connectivity.
router.get('/live', (req: Request, res: Response) => {
    noCache(req, res);
    res.status(200).json({ status: 'alive', service: 'plantlog-api' });
});

// Readiness reflects current MongoDB connection state and process drain flag.
// No connection string, addresses, secrets or internal stack are disclosed.
router.get('/ready', (req: Request, res: Response) => {
    noCache(req, res);
    const result = evaluateReadiness(mongoose.connection.readyState, isDraining());
    res.status(result.httpStatus).json({ status: result.status });
});

export default router;
