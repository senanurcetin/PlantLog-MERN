import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Asset from '../models/Asset';
import User from '../models/User';
import { hasCasefoldSerialUniqueness } from '../utils/databaseIndexes';

dotenv.config();

/**
 * Connection lifecycle belongs to server.ts, so this helper must never
 * terminate the process itself or print connection strings on failure.
 */
const connectDB = async (): Promise<void> => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/industrial_elogbook';
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 10000 });
    // Mongoose connection readiness is not enough: required UNIQUE indexes
    // must exist before an API listener accepts any writes. This demonstrator
    // never drops indexes or attempts to rewrite conflicting existing data.
    await Promise.all([Asset.init(), User.init()]);
    const assetIndexes = await Asset.collection.indexes();
    if (!hasCasefoldSerialUniqueness(assetIndexes)) {
        throw new Error('Required case-insensitive asset serial index is unavailable');
    }
    console.log('PlantLog local demo MongoDB connection and integrity indexes verified');
};

export default connectDB;
