import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/authRoutes';
import assetRoutes from './routes/assetRoutes';
import logEntryRoutes from './routes/logEntryRoutes';

dotenv.config();

const app: Application = express();

// Security and CORS
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:5173', // Vite dev port
        'http://localhost:80',   // Nginx default
        'http://localhost:8080', // Common alt port
        'http://localhost:8081', // Current Docker mapping
        'http://localhost',      // Port 80 without explicit port
    ],
    credentials: true,
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

// Global Error Handler Integration
app.use(errorHandler);

export default app;
