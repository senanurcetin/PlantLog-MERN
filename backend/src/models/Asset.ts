import mongoose, { Schema, Document } from 'mongoose';
import { AssetStatus } from '../utils/assetLifecycle';

export interface AssetStatusEvent {
    from: AssetStatus | null;
    to: AssetStatus;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
}


export interface IAsset extends Document {
    name: string;
    serialNumber: string;
    category: 'machinery' | 'vehicle' | 'equipment' | 'other';
    status: AssetStatus;
    statusHistory?: AssetStatusEvent[];
    __v: number;
    location: string;
    purchaseDate?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AssetStatusEventSchema = new Schema({
    from: { type: String, enum: ['operational', 'maintenance', 'decommissioned', null], default: null },
    to: { type: String, enum: ['operational', 'maintenance', 'decommissioned'], required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, required: true },
}, { _id: false });

const AssetSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add an asset name'],
            trim: true,
        },
        serialNumber: {
            type: String,
            required: [true, 'Please add a serial number'],
            trim: true,
        },
        category: {
            type: String,
            enum: ['machinery', 'vehicle', 'equipment', 'other'],
            required: [true, 'Please provide an asset category'],
        },
        status: {
            type: String,
            enum: ['operational', 'maintenance', 'decommissioned'],
            default: 'operational',
        },
        statusHistory: { type: [AssetStatusEventSchema], default: undefined },
        location: {
            type: String,
            required: [true, 'Please specify the asset location'],
            trim: true,
        },
        purchaseDate: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes to speed up text searches and filtering
AssetSchema.index({ name: 'text', serialNumber: 'text', location: 'text' });
AssetSchema.index({ status: 1, category: 1 });

export default mongoose.model<IAsset>('Asset', AssetSchema);
