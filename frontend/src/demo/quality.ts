import type { DemoInsightAsset, DemoInsightLog } from './insights';

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
    outsideSnapshot: number;
    unlinkedRecords: number;
    invalidDates: number;
    duplicateAssets: number;
    duplicateLogIds: number;
    unknownStatuses: number;
    findings: QualityFinding[];
    caveat: string;
}

/** Deterministic fixture provenance checks. No probabilistic interpretation. */
export const assessDemoDataQuality = (
    assets: DemoInsightAsset[], logs: (DemoInsightLog & { id?: string })[], snapshot: string,
): QualityReport => {
    const end = Date.parse(snapshot + 'T23:59:59.999Z');
    if (!Number.isFinite(end) || new Date(end).toISOString().slice(0, 10) !== snapshot) {
        throw new Error('Invalid snapshot UTC date');
    }
    const knownAssets = new Set<string>();
    let duplicateAssets = 0;
    for (const asset of assets) {
        if (knownAssets.has(asset.id)) duplicateAssets++;
        knownAssets.add(asset.id);
    }
    const ids = new Set<string>();
    let duplicateLogIds = 0, unlinkedRecords = 0, invalidDates = 0;
    let outsideSnapshot = 0, unknownStatuses = 0;
    const statuses = new Set(['open', 'acknowledged', 'in_progress', 'resolved']);
    for (const entry of logs) {
        if (entry.id !== undefined) {
            if (ids.has(entry.id)) duplicateLogIds++;
            ids.add(entry.id);
        }
        if (!knownAssets.has(entry.assetId)) unlinkedRecords++;
        if (!statuses.has(entry.status)) unknownStatuses++;
        const instant = typeof entry.date === 'string' ? Date.parse(entry.date) : NaN;
        if (!Number.isFinite(instant) || !/^\d{4}-\d\d-\d\dT/.test(entry.date)) invalidDates++;
        else if (instant > end) outsideSnapshot++;
    }
    const findings: QualityFinding[] = [
        {code: 'UNLINKED', severity: 'warning', count: unlinkedRecords,
            meaning: 'Entries whose equipment reference is absent from the current fixture'},
        {code: 'INVALID_DATE', severity: 'error', count: invalidDates,
            meaning: 'Entries without a parseable UTC-compatible ISO datetime'},
        {code: 'FUTURE_VS_SNAPSHOT', severity: 'warning', count: outsideSnapshot,
            meaning: 'Entries timestamped after the fixed fictional observation snapshot'},
        {code: 'DUPLICATE_ASSETS', severity: 'error', count: duplicateAssets,
            meaning: 'Repeated equipment identifiers that prevent unambiguous joins'},
        {code: 'DUPLICATE_LOGS', severity: 'error', count: duplicateLogIds,
            meaning: 'Repeated explicit log identifiers'},
        {code: 'UNKNOWN_STATUS', severity: 'error', count: unknownStatuses,
            meaning: 'Log lifecycle statuses outside the documented state model'},
    ];
    const excluded = new Set<number>();
    logs.forEach((entry, index) => {
        const t = Date.parse(entry.date);
        if (!knownAssets.has(entry.assetId) || !statuses.has(entry.status) ||
            !Number.isFinite(t) || t > end) excluded.add(index);
    });
    return {
        assessedRecords: logs.length, assessedAssets: assets.length,
        eligibleRecords: logs.length - excluded.size,
        outsideSnapshot, unlinkedRecords, invalidDates, duplicateAssets,
        duplicateLogIds, unknownStatuses, findings,
        caveat: 'Data integrity checks describe synthetic fixture completeness, not operational reliability or scientific external validity. Duplicate identifiers are tracked separately from the eligible-row count.',
    };
};
