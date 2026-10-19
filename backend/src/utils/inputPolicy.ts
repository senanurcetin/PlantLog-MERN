export class InvalidPayloadError extends Error {
    readonly statusCode = 400;
    constructor(message: string) {
        super(message);
        this.name = 'InvalidPayloadError';
    }
}
const asRecord = (input: unknown): Record<string, unknown> => {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw new InvalidPayloadError('Expected a JSON object');
    }
    return input as Record<string, unknown>;
};
const pickAllowed = (input: unknown, allowed: readonly string[]): Record<string, unknown> => {
    const body = asRecord(input);
    const keys = Object.keys(body);
    if (keys.length === 0) throw new InvalidPayloadError('At least one field is required');
    const invalid = keys.filter(key => !allowed.includes(key) || key.startsWith('$') || key.includes('.'));
    if (invalid.length > 0) throw new InvalidPayloadError('Unsupported fields: ' + invalid.join(', '));
    return Object.fromEntries(keys.map(key => [key, body[key]]));
};
const assetFields = ['name', 'serialNumber', 'category', 'status', 'location', 'purchaseDate'] as const;
const logFields = ['type', 'title', 'description', 'status', 'metrics'] as const;
const metricFields = ['temperature', 'pressure', 'hoursOperated'] as const;
export const pickAssetUpdate = (body: unknown): Record<string, unknown> => pickAllowed(body, assetFields);
export const pickLogUpdate = (body: unknown): Record<string, unknown> => {
    const fields = pickAllowed(body, logFields);
    if (fields.metrics !== undefined) {
        const metrics = asRecord(fields.metrics);
        for (const [key, value] of Object.entries(metrics)) {
            if (!metricFields.includes(key as typeof metricFields[number])) {
                throw new InvalidPayloadError('Unsupported metric: ' + key);
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new InvalidPayloadError('Metric values must be finite numbers');
            }
        }
    }
    return fields;
};
/** Reject query selector objects and normalize case before calling MongoDB. */
export const sanitizeLogin = (input: unknown) => {
    const body = asRecord(input);
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        throw new InvalidPayloadError('Email and password must be strings');
    }
    const email = body.email.trim().toLowerCase();
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
        throw new InvalidPayloadError('A valid email is required');
    }
    if (!body.password || body.password.length > 1024) {
        throw new InvalidPayloadError('Invalid password length');
    }
    return { email, password: body.password };
};

export const sanitizeRegistration = (input: unknown) => {
    const body = asRecord(input);
    if (body.role !== undefined && body.role !== 'operator') {
        throw new InvalidPayloadError('Privileged roles cannot be self-assigned');
    }
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
        throw new InvalidPayloadError('Name must contain at least 2 characters');
    }
    if (typeof body.email !== 'string' || !body.email.trim()) {
        throw new InvalidPayloadError('A valid email is required');
    }
    if (typeof body.password !== 'string' || body.password.length < 12) {
        throw new InvalidPayloadError('Password must be at least 12 characters');
    }
    return { name: body.name.trim(), email: body.email.trim().toLowerCase(),
        password: body.password, role: 'operator' as const };
};
