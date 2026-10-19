import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { resolveAllowedOrigins } from './utils/corsPolicy';
import authRoutes from './routes/authRoutes';
import assetRoutes from './routes/assetRoutes';
import logEntryRoutes from './routes/logEntryRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'success', message: 'Industrial E-Logbook API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/logs', logEntryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler Integration
app.use(errorHandler);

export default app;
