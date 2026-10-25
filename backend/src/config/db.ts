import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connection lifecycle belongs to server.ts, so this helper must never
 * terminate the process itself or print connection strings on failure.
 */
const connectDB = async (): Promise<void> => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/industrial_elogbook';
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
    console.log('PlantLog local demo MongoDB connection established');
};

export default connectDB;
