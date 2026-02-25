import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset extends Document {
    name: string;
    serialNumber: string;
    category: 'machinery' | 'vehicle' | 'equipment' | 'other';
    status: 'operational' | 'maintenance' | 'decommissioned';
    location: string;
    purchaseDate?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

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
            unique: true,
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
