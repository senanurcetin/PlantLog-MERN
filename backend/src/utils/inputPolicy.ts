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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
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

/**
 * A new operational record accepts only declared user-editable fields.
 * Server-owned author, asset reference, status history, and lifecycle times
 * must never be accepted from the request body.
 */
export const sanitizeLogCreation = (input: unknown) => {
    const fields = pickAllowed(input, ['assetId', 'type', 'title', 'description', 'status', 'metrics']);
    const requiredText = (key: 'assetId' | 'type' | 'title' | 'description'): string => {
        const value = fields[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new InvalidPayloadError(key + ' must be a non-empty string');
        }
        return value.trim();
    };
    const assetId = requiredText('assetId');
    const type = requiredText('type');
    if (!['operation', 'maintenance', 'incident', 'inspection'].includes(type)) {
        throw new InvalidPayloadError('Unsupported log type');
    }
    const title = requiredText('title');
    const description = requiredText('description');
    if (title.length > 200 || description.length > 10000) {
        throw new InvalidPayloadError('Log title or description exceeds supported length');
    }
    if (fields.status !== undefined && fields.status !== 'open') {
        throw new InvalidPayloadError('A new log entry must start in open status');
    }
    const metrics = fields.metrics === undefined
        ? undefined : pickLogUpdate({ metrics: fields.metrics }).metrics;
    return { assetId, type, title, description, metrics };
};

/** Validate the untrusted asset creation body before any database access. */
export const sanitizeAssetCreation = (input: unknown) => {
    const fields = pickAllowed(input, [
        'name', 'serialNumber', 'category', 'location', 'purchaseDate', 'status',
    ]);
    const required = (field: 'name' | 'serialNumber' | 'location', limit: number) => {
        const value = fields[field];
        if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > limit) {
            throw new InvalidPayloadError(field + ' must be a non-empty string of at most ' + limit + ' characters');
        }
        return value.trim();
    };
    const name = required('name', 120);
    const serialNumber = required('serialNumber', 100);
    const location = required('location', 160);
    const category = fields.category;
    if (typeof category !== 'string' ||
        !['machinery', 'vehicle', 'equipment', 'other'].includes(category)) {
        throw new InvalidPayloadError('Unsupported asset category');
    }
    // Only a supervisor/admin can subsequently change a new asset's status.
    if (fields.status !== undefined && fields.status !== 'operational') {
        throw new InvalidPayloadError('New assets must start in operational status');
    }
    let purchaseDate: Date | undefined;
    if (fields.purchaseDate !== undefined) {
        const supplied = fields.purchaseDate;
        if (typeof supplied !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(supplied)) {
            throw new InvalidPayloadError('purchaseDate must be an ISO calendar date (YYYY-MM-DD)');
        }
        purchaseDate = new Date(supplied + 'T00:00:00.000Z');
        if (!Number.isFinite(purchaseDate.getTime()) ||
            purchaseDate.toISOString().slice(0, 10) !== supplied) {
            throw new InvalidPayloadError('Invalid calendar date');
        }
    }
    return { name, serialNumber, location, category, status: 'operational' as const, purchaseDate };
};
