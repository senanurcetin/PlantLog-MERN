import mongoose, { Schema, Document } from 'mongoose';
import { LogStatus } from '../utils/logLifecycle';

export interface StatusHistoryItem {
    from: LogStatus | null;
    to: LogStatus;
    changedAt: Date;
    changedBy: mongoose.Types.ObjectId;
}
export interface ILogEntry extends Document {
    asset: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    type: 'operation' | 'maintenance' | 'incident' | 'inspection';
    title: string;
    description: string;
    status: LogStatus;
    __v: number;
    metrics?: {
        temperature?: number;
        pressure?: number;
        hoursOperated?: number;
    };
    reportedAt?: Date;
    acknowledgedAt?: Date;
    workStartedAt?: Date;
    resolvedAt?: Date;
    statusHistory?: StatusHistoryItem[];
    createdAt: Date;
    updatedAt: Date;
}

const StatusEventSchema = new Schema({
    from: { type: String, enum: ['open', 'acknowledged', 'in_progress', 'resolved', null], default: null },
    to: { type: String, enum: ['open', 'acknowledged', 'in_progress', 'resolved'], required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false });

const LogEntrySchema: Schema = new Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Asset',
        required: [true, 'Log entry must be associated with an asset'],
    },
    author: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: [true, 'Log entry must have an author'],
    },
    type: {
        type: String,
        enum: ['operation', 'maintenance', 'incident', 'inspection'],
        required: [true, 'Log entry must have a type'],
    },
    title: { type: String, required: [true, 'Please add a title'], trim: true },
    description: { type: String, required: [true, 'Please provide a detailed description'] },
    status: {
        type: String, enum: ['open', 'acknowledged', 'in_progress', 'resolved'],
        default: 'open',
    },
    metrics: {
        temperature: { type: Number },
        pressure: { type: Number },
        hoursOperated: { type: Number },
    },
    // Optional fields: do not fabricate historical transitions for legacy records.
    reportedAt: { type: Date },
    acknowledgedAt: { type: Date },
    workStartedAt: { type: Date },
    resolvedAt: { type: Date },
    statusHistory: { type: [StatusEventSchema], default: undefined },
}, { timestamps: true });

LogEntrySchema.index({ asset: 1, createdAt: -1 });
LogEntrySchema.index({ type: 1, status: 1 });
LogEntrySchema.index({ author: 1 });
LogEntrySchema.index({ reportedAt: -1, type: 1 });

export default mongoose.model<ILogEntry>('LogEntry', LogEntrySchema);
