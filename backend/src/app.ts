import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { resolveAllowedOrigins } from './utils/corsPolicy';
import authRoutes from './routes/authRoutes';
import assetRoutes from './routes/assetRoutes';
import logEntryRoutes from './routes/logEntryRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import healthRoutes from './routes/healthRoutes';

dotenv.config();

const app: Application = express();

// Security and CORS
app.use(helmet());
app.use(cors({
    origin: resolveAllowedOrigins(),
    // Bearer tokens travel in Authorization; this demo does not use cookies.
    credentials: false,
    maxAge: 600,
}));

// JSON-only write API: no HTML forms or ambiguous URL-encoded object graphs.
// Keep the payload ceiling comfortably above a documented log description,
// but below the default 100 KB Express parser limit.
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
        res.status(415).json({ message: 'API write requests require application/json' });
        return;
    }
    next();
});
app.use(express.json({ limit: '32kb', strict: true }));

// Basic Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'success', message: 'Industrial E-Logbook API is running' });
});

// Split liveness/readiness checks are intentionally public but disclose no infrastructure details.
app.use('/api/health', healthRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/logs', logEntryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler Integration
app.use(errorHandler);

export default app;
