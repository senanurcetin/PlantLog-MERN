import mongoose, { Schema, Document } from 'mongoose';

export const auditActions = [
    'auth.register', 'auth.login', 'auth.logout',
    'asset.create', 'asset.update', 'asset.delete',
    'log.create', 'log.update', 'audit.read',
] as const;
export type AuditAction = typeof auditActions[number];
export type AuditOutcome = 'success' | 'denied' | 'failed';

/**
 * Deliberately minimal pre-production audit record. Not a certified or
 * tamper-proof ledger. Never retain request bodies, emails, passwords,
 * JWTs, remote IP addresses, headers or freeform incident descriptions.
 */
export interface IAuditEvent extends Document {
    action: AuditAction;
    outcome: AuditOutcome;
    statusCode: number;
    actorId?: mongoose.Types.ObjectId;
    resourceType: 'auth' | 'asset' | 'log' | 'audit';
    resourceId?: mongoose.Types.ObjectId;
    occurredAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>({
    action: { type: String, enum: auditActions, required: true, immutable: true },
    outcome: { type: String, enum: ['success', 'denied', 'failed'], required: true, immutable: true },
    statusCode: { type: Number, min: 200, max: 599, required: true, immutable: true },
    actorId: { type: Schema.Types.ObjectId, immutable: true },
    resourceType: { type: String, enum: ['auth', 'asset', 'log', 'audit'], required: true, immutable: true },
    resourceId: { type: Schema.Types.ObjectId, immutable: true },
    occurredAt: { type: Date, required: true, default: Date.now, immutable: true },
}, { versionKey: false, strict: 'throw', collection: 'audit_events' });

// Local demo retention: an eventually processed TTL index is NOT a verified
// erasure SLA or a production data retention policy.
AuditEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: 30 * 86400 });

export default mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
