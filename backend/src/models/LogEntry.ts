import mongoose, { Schema, Document } from 'mongoose';

export interface ILogEntry extends Document {
    asset: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    type: 'operation' | 'maintenance' | 'incident' | 'inspection';
    title: string;
    description: string;
    status: 'open' | 'resolved' | 'acknowledged';
    metrics?: {
        temperature?: number;
        pressure?: number;
        hoursOperated?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const LogEntrySchema: Schema = new Schema(
    {
        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Asset',
            required: [true, 'Log entry must be associated with an asset'],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Log entry must have an author'],
        },
        type: {
            type: String,
            enum: ['operation', 'maintenance', 'incident', 'inspection'],
            required: [true, 'Log entry must have a type'],
        },
        title: {
            type: String,
            required: [true, 'Please add a title'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Please provide a detailed description'],
        },
        status: {
            type: String,
            enum: ['open', 'resolved', 'acknowledged'],
            default: 'open',
        },
        metrics: {
            temperature: { type: Number },
            pressure: { type: Number },
            hoursOperated: { type: Number },
        },
    },
    {
        timestamps: true,
    }
);

// High-performance indexing for chronological log queries
LogEntrySchema.index({ asset: 1, createdAt: -1 });
LogEntrySchema.index({ type: 1, status: 1 });
LogEntrySchema.index({ author: 1 });

export default mongoose.model<ILogEntry>('LogEntry', LogEntrySchema);
