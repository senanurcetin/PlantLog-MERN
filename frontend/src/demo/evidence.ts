import { buildDemoInsights } from './insights';
import type { DemoInsightAsset } from './insights';

export type EvidenceCase =
    'baseline' | 'unlinked' | 'missing-history' | 'duplicate-id' | 'future-date';

export const evidenceCases: ReadonlyArray<{
    id: EvidenceCase;
    label: string;
    change: string;
}> = [
    { id: 'baseline', label: 'Reference dataset', change: 'Unchanged fictional records' },
    { id: 'unlinked', label: 'Broken asset link', change: 'Disconnect one open incident from its equipment' },
    { id: 'missing-history', label: 'Missing audit history', change: 'Remove the transitions from one resolved maintenance case' },
    { id: 'duplicate-id', label: 'Duplicate record ID', change: 'Reuse an identifier on two sample entries' },
    { id: 'future-date', label: 'Future-dated record', change: 'Move an open record past the fixed snapshot' },
] as const;

export interface EvidenceEvent {
    from: string | null;
    to: string;
    changedAt: string;
    changedBy: string;
}
export interface EvidenceLog {
    id: string;
    assetId: string;
    type: string;
    status: string;
    date: string;
    statusHistory: EvidenceEvent[];
}
export interface EvidenceFixture {
    assets: DemoInsightAsset[];
    logs: EvidenceLog[];
    context: { snapshot: string };
}
export interface EvidenceAudit {
    records: number;
    unlinkedRecords: number;
    duplicatedRecordIds: number;
    duplicatedAssetIds: number;
    invalidDates: number;
    futureDatedRecords: number;
    incompleteCaseHistories: number;
    evidenceQualifiedResolved: number;
    eligibleResolutionMinutes: number[];
    openMaintenanceCases: number;
    unlinkedOpenCases: number;
    outsideWindow: number;
}

const eventTime = (value: string): number => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return NaN;
    return new Date(value).getTime();
};
const accepted: Record<string, string[]> = {
    open: ['acknowledged', 'resolved'],
    acknowledged: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
};

/** A complete, chronologically consistent audit record is required for eligibility. */
export const hasVerifiableHistory = (record: EvidenceLog, snapshotEnd: number): boolean => {
    const created = eventTime(record.date);
    if (!Number.isFinite(created) || created > snapshotEnd) return false;
    const history = record.statusHistory;
    if (!Array.isArray(history) || history.length === 0) return false;
    if (history[0].from !== null || history[0].to !== 'open' ||
        eventTime(history[0].changedAt) !== created) return false;
    let previous = 'open';
    let lastTime = created;
    for (let index = 0; index < history.length; index++) {
        const event = history[index];
        const time = eventTime(event.changedAt);
        if (typeof event.changedBy !== 'string' || !event.changedBy.trim() ||
            !Number.isFinite(time) || time < lastTime || time > snapshotEnd) return false;
        if (index > 0) {
            if (event.from !== previous || !accepted[previous]?.includes(event.to)) return false;
        }
        previous = event.to;
        lastTime = time;
    }
    return previous === record.status;
};

/**
 * Audits observable data quality, not failure risk, uptime, service
 * compliance or inferred repair duration. Missing evidence stays missing.
 */
export const auditEvidence = (dataset: EvidenceFixture): EvidenceAudit => {
    const snapshotEnd = new Date(dataset.context.snapshot + 'T23:59:59.999Z').getTime();
    if (!Number.isFinite(snapshotEnd) ||
        new Date(snapshotEnd).toISOString().slice(0, 10) !== dataset.context.snapshot) {
        throw new Error('Invalid fictional snapshot');
    }
    const assetIds = new Set<string>();
    let duplicatedAssetIds = 0;
    for (const asset of dataset.assets) {
        if (assetIds.has(asset.id)) duplicatedAssetIds++;
        assetIds.add(asset.id);
    }
    const recordIds = new Set<string>();
    let duplicatedRecordIds = 0, unlinkedRecords = 0, invalidDates = 0;
    let futureDatedRecords = 0, incompleteCaseHistories = 0, evidenceQualifiedResolved = 0;
    const eligibleResolutionMinutes: number[] = [];
    for (const log of dataset.logs) {
        if (recordIds.has(log.id)) duplicatedRecordIds++;
        recordIds.add(log.id);
        if (!assetIds.has(log.assetId)) unlinkedRecords++;
        const time = eventTime(log.date);
        if (!Number.isFinite(time)) invalidDates++;
        else if (time > snapshotEnd) futureDatedRecords++;
        if (!['incident', 'maintenance'].includes(log.type)) continue;
        if (!hasVerifiableHistory(log, snapshotEnd)) {
            incompleteCaseHistories++;
            continue;
        }
        if (log.status === 'resolved') {
            evidenceQualifiedResolved++;
            eligibleResolutionMinutes.push(Math.round(
                (eventTime(log.statusHistory[log.statusHistory.length - 1].changedAt) -
                    eventTime(log.statusHistory[0].changedAt)) / 60000,
            ));
        }
    }
    const summary = buildDemoInsights(dataset.assets, dataset.logs, dataset.context.snapshot);
    return {
        records: dataset.logs.length, unlinkedRecords, duplicatedRecordIds,
        duplicatedAssetIds, invalidDates, futureDatedRecords,
        incompleteCaseHistories, evidenceQualifiedResolved, eligibleResolutionMinutes,
        openMaintenanceCases: summary.openMaintenanceCases,
        unlinkedOpenCases: summary.unlinkedOpenCases,
        outsideWindow: summary.outsideWindow,
    };
};

/** Clones only the affected fictional log; does not alter the source fixture. */
export const runEvidenceCase = (fixture: EvidenceFixture, scenario: EvidenceCase): EvidenceAudit => {
    const logs = fixture.logs.map(log => ({ ...log, statusHistory: log.statusHistory.map(x => ({ ...x })) }));
    if (scenario === 'unlinked') {
        const target = logs.find(log => log.id === 'L012');
        if (!target) throw new Error('Missing controlled evidence fixture L012');
        target.assetId = 'MISSING-EQUIPMENT';
    } else if (scenario === 'missing-history') {
        const target = logs.find(log => log.id === 'L007');
        if (!target) throw new Error('Missing controlled evidence fixture L007');
        target.statusHistory = [];
    } else if (scenario === 'duplicate-id') {
        const target = logs.find(log => log.id === 'L009');
        if (!target) throw new Error('Missing controlled evidence fixture L009');
        target.id = 'L010';
    } else if (scenario === 'future-date') {
        const target = logs.find(log => log.id === 'L011');
        if (!target) throw new Error('Missing controlled evidence fixture L011');
        target.date = '2026-10-19T02:10:00.000Z';
    } else if (scenario !== 'baseline') {
        throw new Error('Unknown controlled experiment');
    }
    return auditEvidence({ assets: fixture.assets, logs, context: fixture.context });
};
