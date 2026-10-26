import { InvalidPayloadError } from './inputPolicy';

/**
 * Strong If-Match revision token: a quoted, nonnegative decimal __v counter.
 * Optional for legacy local clients. Weak ETags, wildcards, lists and coercion
 * are rejected rather than silently applying an unintended update.
 */
export const parseExpectedRevision = (value: unknown): number | null => {
    if (value === undefined) return null;
    if (typeof value !== 'string') {
        throw new InvalidPayloadError('If-Match must be a quoted record revision');
    }
    const match = /^"(0|[1-9][0-9]{0,14})"$/.exec(value);
    if (!match) throw new InvalidPayloadError('If-Match must be a quoted record revision');
    const version = Number(match[1]);
    if (!Number.isSafeInteger(version)) {
        throw new InvalidPayloadError('If-Match revision out of range');
    }
    return version;
};

export const revisionEtag = (revision: number): string => '"' + revision + '"';
