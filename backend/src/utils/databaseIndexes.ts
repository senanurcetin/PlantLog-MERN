/**
 * A successful Mongo connection does not establish data integrity.
 * Startup must confirm that the case-insensitive serial number index exists,
 * otherwise a racing request could insert duplicate equipment identities.
 */
export interface MongoIndexMetadata {
    key?: Record<string, unknown>;
    name?: string;
    unique?: boolean;
    collation?: { locale?: string; strength?: number };
}

export const hasCasefoldSerialUniqueness = (
    indexes: readonly MongoIndexMetadata[],
): boolean => indexes.some(index =>
    index.name === 'serial_number_unique_casefold' &&
    index.unique === true &&
    Object.keys(index.key || {}).length === 1 &&
    index.key?.serialNumber === 1 &&
    index.collation?.locale === 'en' &&
    index.collation?.strength === 2
);
