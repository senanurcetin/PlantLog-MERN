import type { DemoInsightAsset, DemoInsightLog } from './insights';
import { buildDemoInsights } from './insights';
import { assessDemoDataQuality } from './quality';
import type { QualityFinding } from './quality';

export interface EligibilitySensitivityCase {
    id: string;
    title: string;
    assumption: string;
    assessed: number;
    eligible: number;
    excluded: number;
    rawOpenCases: number;
    eligibleOpenCases: number;
    rawUnlinkedCases: number;
    eligibleUnlinkedCases: number;
    findings: QualityFinding[];
}

type AuditedLog = DemoInsightLog & { id?: string };

const designs = [
    { id: 'baseline', title: 'Baseline', assumption: 'The unchanged fictional fixture; all records meet the declared quality rules.' },
    { id: 'orphan', title: 'Broken equipment link', assumption: 'Exactly one incident points to an equipment identifier absent from the synthetic registry.' },
    { id: 'date', title: 'Invalid UTC date', assumption: 'Exactly one timestamp becomes an impossible calendar date (30 February).' },
    { id: 'duplicate', title: 'Duplicate event ID', assumption: 'One event inherits another event ID; both ambiguous rows are excluded.' },
    { id: 'overlap', title: 'Overlapping defects', assumption: 'One event simultaneously has a broken link, invalid timestamp and unknown lifecycle state.' },
] as const;

/**
 * Data-integrity sensitivity experiments, NOT reliability estimates or
 * causal effects. Each nonbaseline row changes one EXISTING fictional record;
 * all comparisons start independently from the original fixture.
 *
 * The raw view is the deliberately permissive descriptive workload count.
 * The eligible view recomputes the same metric after applying all gates.
 */
export const buildEligibilitySensitivity = (
    assets: DemoInsightAsset[], records: AuditedLog[], snapshot: string,
): EligibilitySensitivityCase[] => {
    const baseline = assessDemoDataQuality(assets, records, snapshot);
    if (records.length < 2 || baseline.eligibleRecords !== records.length ||
        records.some(record => !record.id?.trim())) {
        throw new Error('Sensitivity cases require at least two eligible, identified baseline events');
    }
    return designs.map(design => {
        const logs = records.map(record => ({ ...record }));
        if (design.id === 'orphan' || design.id === 'overlap') {
            logs[0].assetId = 'FIXTURE-NOT-REGISTERED';
        }
        if (design.id === 'date' || design.id === 'overlap') {
            logs[0].date = '2026-02-30T12:00:00Z';
        }
        if (design.id === 'duplicate') {
            logs[1].id = logs[0].id;
        }
        if (design.id === 'overlap') {
            logs[0].status = 'unknown_state';
        }
        const audit = assessDemoDataQuality(assets, logs, snapshot);
        const raw = buildDemoInsights(assets, logs, snapshot);
        const filteredLogs = audit.eligibleRecordIndices.map(index => logs[index]);
        const filtered = buildDemoInsights(assets, filteredLogs, snapshot);
        return {
            id: design.id,
            title: design.title,
            assumption: design.assumption,
            assessed: audit.assessedRecords,
            eligible: audit.eligibleRecords,
            excluded: audit.assessedRecords - audit.eligibleRecords,
            rawOpenCases: raw.openMaintenanceCases,
            eligibleOpenCases: filtered.openMaintenanceCases,
            rawUnlinkedCases: raw.unlinkedOpenCases,
            eligibleUnlinkedCases: filtered.unlinkedOpenCases,
            findings: audit.findings.filter(finding => finding.count > 0),
        };
    });
};
