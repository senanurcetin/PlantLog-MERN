import app from './app';
import connectDB from './config/db';
import mongoose from 'mongoose';
import { Server } from 'node:http';
import { getJwtSecret } from './utils/jwtSecret';
import { resolveApiBindHost } from './utils/runtimePosture';
import { beginShutdown } from './utils/readiness';

const port = Number(process.env.PORT ?? '5000');

/**
 * API listener for a local-only engineering prototype. It is NOT a public
 * production deployment. NODE_ENV=production only affects runtime behavior.
 */
const startServer = async (): Promise<void> => {
    try {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('PORT must be an integer between 1 and 65535');
        }
        // Check network posture and secret before making a DB connection.
        const bindHost = resolveApiBindHost();
        getJwtSecret();
        await connectDB();

        const server: Server = app.listen(port, bindHost, () => {
            console.log(`PlantLog LOCAL DEMO API listening on ${bindHost}:${port}; not production-approved`);
        });

        let closing = false;
        const shutdown = (signal: string): void => {
            if (closing) return;
            closing = true;
            beginShutdown(); // /api/health/ready immediately becomes 503.
            console.log(`PlantLog demo shutting down after ${signal}`);
            const timer = setTimeout(() => {
                console.error('PlantLog shutdown exceeded drain deadline');
                server.closeAllConnections();
                process.exit(1);
            }, 10000);
            timer.unref();
            server.close(async error => {
                if (error) {
                    console.error('HTTP listener did not close cleanly');
                    process.exitCode = 1;
                }
                try {
                    await mongoose.disconnect();
                } catch {
                    console.error('MongoDB connection did not close cleanly');
                    process.exitCode = 1;
                } finally {
                    clearTimeout(timer);
                }
            });
        };
        process.once('SIGTERM', () => shutdown('SIGTERM'));
        process.once('SIGINT', () => shutdown('SIGINT'));
        server.once('error', () => {
            console.error('Unable to start the local API listener');
            process.exitCode = 1;
            void mongoose.disconnect();
        });
    } catch {
        // Avoid printing connection strings, signing secrets or credentials.
        console.error('PlantLog API startup refused: verify local demo configuration');
        process.exitCode = 1;
    }
};

void startServer();
