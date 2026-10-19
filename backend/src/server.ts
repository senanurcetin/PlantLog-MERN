import app from './app';
import connectDB from './config/db';
import { getJwtSecret } from './utils/jwtSecret';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Fail fast instead of reporting a healthy API with unusable token signing.
        getJwtSecret();
        // Connect to database
        await connectDB();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
