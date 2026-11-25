import mongoose, { Schema, Document } from 'mongoose';

/**
 * Shared login/registration attempt counter. One small document per
 * (route scope, client address) and window; MongoDB removes it after the
 * window through the TTL index, so the collection stays bounded by the
 * number of distinct clients seen in one window.
 */
export interface IAuthRateLimit extends Document {
    key: string;
    count: number;
    resetAt: Date;
}

const AuthRateLimitSchema = new Schema<IAuthRateLimit>({
    key: { type: String, required: true, maxlength: 120 },
    count: { type: Number, required: true, min: 0 },
    resetAt: { type: Date, required: true },
}, { versionKey: false, strict: 'throw', collection: 'auth_rate_limits' });

AuthRateLimitSchema.index({ key: 1 }, { unique: true });
// The TTL monitor runs about once a minute; an expired-but-present document is
// still treated as a fresh window by the atomic update below.
AuthRateLimitSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAuthRateLimit>('AuthRateLimit', AuthRateLimitSchema);
