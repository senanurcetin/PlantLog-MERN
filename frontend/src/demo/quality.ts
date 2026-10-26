import type { DemoInsightAsset, DemoInsightLog } from './insights';

export type QualityFindingCode =
    | 'UNLINKED' | 'INVALID_DATE' | 'FUTURE_VS_SNAPSHOT'
    | 'DUPLICATE_ASSETS' | 'DUPLICATE_LOGS' | 'MISSING_LOG_ID'
    | 'UNKNOWN_TYPE' | 'UNKNOWN_STATUS';

export interface QualityRowAssessment {
    /** Index in the input array, not a database identifier. */
    index: number;
    eligible: boolean;
    /** Per-row reasons; may not numerically match dataset-level duplicate counters. */
    codes: QualityFindingCode[];
}

export interface QualityFinding {
    code: string;
    severity: 'error' | 'warning';
    count: number;
    meaning: string;
}
export interface QualityReport {
    assessedRecords: number;
    assessedAssets: number;
    eligibleRecords: number;
    /** Zero-based record indices retained by all quality gates; immutable audit view. */
    eligibleRecordIndices: number[];
    /** Same input order; no names, identifiers, or timestamp values are emitted. */
    rowAssessments: QualityRowAssessment[];
    outsideSnapshot: number;
    unlinkedRecords: number;
    invalidDates: number;
    duplicateAssets: number;
    duplicateLogIds: number;
    missingLogIds: number;
    unknownTypes: number;
    unknownStatuses: number;
    findings: QualityFinding[];
    caveat: string;
}

/**
 * Require an explicit UTC instant. Date.parse alone normalizes impossible
 * calendar dates (e.g. February 30) and accepts timezone-less local times.
 * A small strict grammar plus round-trip protects cross-machine reproducibility.
 */
export const isCanonicalDemoTimestamp = (value: unknown): value is string => {
    if (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
        return false;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19);
};

/** Deterministic, auditable fixture checks; no probabilistic interpretation. */
export const assessDemoDataQuality = (
    assets: DemoInsightAsset[], logs: (DemoInsightLog & { id?: string })[], snapshot: string,
): QualityReport => {
    const snapshotEnd = snapshot + 'T23:59:59.999Z';
    if (!isCanonicalDemoTimestamp(snapshotEnd)) {
        throw new Error('Invalid snapshot UTC date');
    }
    const end = Date.parse(snapshotEnd);
    const knownAssets = new Set<string>();
    const duplicateAssetIds = new Set<string>();
    let duplicateAssets = 0;
    for (const asset of assets) {
        if (knownAssets.has(asset.id)) {
            duplicateAssets++;
            duplicateAssetIds.add(asset.id);
        }
        knownAssets.add(asset.id);
    }
    const ids = new Set<string>();
    const duplicateLogIdValues = new Set<string>();
    const statuses = new Set(['open', 'acknowledged', 'in_progress', 'resolved']);
    const types = new Set(['incident', 'maintenance', 'inspection', 'operation']);
    let duplicateLogIds = 0, missingLogIds = 0, unknownTypes = 0;
    let unlinkedRecords = 0, invalidDates = 0, outsideSnapshot = 0, unknownStatuses = 0;

    for (const entry of logs) {
        if (typeof entry.id !== 'string' || !entry.id.trim()) {
            missingLogIds++;
        } else {
            if (ids.has(entry.id)) {
                duplicateLogIds++;
                duplicateLogIdValues.add(entry.id);
            }
            ids.add(entry.id);
        }
        if (!knownAssets.has(entry.assetId)) unlinkedRecords++;
        if (!types.has(entry.type)) unknownTypes++;
        if (!statuses.has(entry.status)) unknownStatuses++;
        if (!isCanonicalDemoTimestamp(entry.date)) invalidDates++;
        else if (Date.parse(entry.date) > end) outsideSnapshot++;
    }

    const findings: QualityFinding[] = [
        { code: 'UNLINKED', severity: 'warning', count: unlinkedRecords,
            meaning: 'Entries whose equipment reference is absent from the current fixture' },
        { code: 'INVALID_DATE', severity: 'error', count: invalidDates,
            meaning: 'Entries without a real, explicit UTC (Z) ISO timestamp' },
        { code: 'FUTURE_VS_SNAPSHOT', severity: 'warning', count: outsideSnapshot,
            meaning: 'Entries timestamped after the fixed fictional observation snapshot' },
        { code: 'DUPLICATE_ASSETS', severity: 'error', count: duplicateAssets,
            meaning: 'Repeated equipment identifiers that prevent unambiguous joins' },
        { code: 'DUPLICATE_LOGS', severity: 'error', count: duplicateLogIds,
            meaning: 'Repeated explicit log identifiers' },
        { code: 'MISSING_LOG_ID', severity: 'error', count: missingLogIds,
            meaning: 'Entries without a nonblank log identifier' },
        { code: 'UNKNOWN_TYPE', severity: 'error', count: unknownTypes,
            meaning: 'Entries outside the four documented log categories' },
        { code: 'UNKNOWN_STATUS', severity: 'error', count: unknownStatuses,
            meaning: 'Log lifecycle statuses outside the documented state model' },
    ];
    // Derive row membership and its reasons from one ordered diagnostic
    // path. Duplicate-ID counters above count excess duplicates, whereas a
    // duplicate-ID row finding marks ALL ambiguous rows for exclusion.
    const rowAssessments: QualityRowAssessment[] = logs.map((entry, index) => {
        const codes: QualityFindingCode[] = [];
        if (!knownAssets.has(entry.assetId)) codes.push('UNLINKED');
        if (!isCanonicalDemoTimestamp(entry.date)) codes.push('INVALID_DATE');
        else if (Date.parse(entry.date) > end) codes.push('FUTURE_VS_SNAPSHOT');
        if (duplicateAssetIds.has(entry.assetId)) codes.push('DUPLICATE_ASSETS');
        if (typeof entry.id !== 'string' || !entry.id.trim()) {
            codes.push('MISSING_LOG_ID');
        } else if (duplicateLogIdValues.has(entry.id)) {
            codes.push('DUPLICATE_LOGS');
        }
        if (!types.has(entry.type)) codes.push('UNKNOWN_TYPE');
        if (!statuses.has(entry.status)) codes.push('UNKNOWN_STATUS');
        return { index, eligible: codes.length === 0, codes };
    });
    const eligibleRecordIndices = rowAssessments
        .filter(row => row.eligible).map(row => row.index);

    return {
        assessedRecords: logs.length, assessedAssets: assets.length,
        eligibleRecords: eligibleRecordIndices.length,
        eligibleRecordIndices,
        rowAssessments,
        outsideSnapshot, unlinkedRecords, invalidDates, duplicateAssets,
        duplicateLogIds, missingLogIds, unknownTypes, unknownStatuses, findings,
        caveat: 'These synthetic-data checks are not operational reliability or external scientific validation. Entries with missing/repeated log identifiers, ambiguous equipment IDs, invalid UTC timestamps or unknown event types/states are excluded from quality eligibility; findings may overlap. Descriptive workload charts still show raw fixture counts.',
    };
};
