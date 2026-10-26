import { assessLifecycleTraceability } from './traceability';
import { assessDemoDataQuality } from './quality';
import type { DemoInsightAsset, DemoInsightLog } from './insights';
import type { TraceabilityIssueCode } from './traceability';

type Classification = 'verified' | 'unrecorded' | 'invalid';
type Event = { from: string | null; to: string; changedAt: string; changedBy: string };
type BoundaryLog = DemoInsightLog & { id: string; statusHistory: Event[] };

export interface TemporalBoundaryCase {
    id: string;
    title: string;
    assumption: string;
    observationDateUTC: string;
    expected: { eligible: boolean; classification: Classification; issueCodes: TraceabilityIssueCode[] };
    observed: { eligible: boolean; classification: Classification; issueCodes: TraceabilityIssueCode[] };
    matchesExpected: boolean;
}

interface BoundaryDesign {
    id: string;
    title: string;
    assumption: string;
    snapshot: string;
    opening: string;
    resolution: string;
    expectedEligible: boolean;
    expectedClassification: Classification;
    expectedCodes: TraceabilityIssueCode[];
    change?: (record: BoundaryLog) => void;
}

const snapshot = '2026-10-18';
const opening = '2026-10-18T08:00:00.000Z';
const resolution = '2026-10-18T09:00:00.000Z';

/**
 * Pure, bounded, UTC-only edge cases. Each case constructs a new fictional
 * incident, never edits fixture rows, and never calls an API or clock.
 */
const designs: readonly BoundaryDesign[] = [
    { id: 'ordinary', title: 'Valid UTC reference',
        assumption: 'Normal same-day opening and resolution.',
        snapshot, opening, resolution, expectedEligible: true,
        expectedClassification: 'verified', expectedCodes: [] },
    { id: 'final-millisecond', title: 'Inclusive snapshot endpoint',
        assumption: 'Opening and resolution at exactly 23:59:59.999Z are allowed.',
        snapshot, opening: '2026-10-18T23:59:59.999Z',
        resolution: '2026-10-18T23:59:59.999Z', expectedEligible: true,
        expectedClassification: 'verified', expectedCodes: [] },
    { id: 'post-snapshot-transition', title: 'First millisecond after snapshot',
        assumption: 'A case opened in the window is invalid when its closing event is after observation.',
        snapshot, opening: '2026-10-18T23:59:59.999Z',
        resolution: '2026-10-19T00:00:00.000Z', expectedEligible: true,
        expectedClassification: 'invalid', expectedCodes: ['AFTER_SNAPSHOT'] },
    { id: 'reversed-time', title: 'Resolution precedes opening',
        assumption: 'A later array element cannot predate the opening event.',
        snapshot, opening, resolution: '2026-10-18T07:59:59.999Z', expectedEligible: true,
        expectedClassification: 'invalid', expectedCodes: ['NON_MONOTONIC_TIME'] },
    { id: 'leap-day', title: 'Real leap day transition',
        assumption: 'February 29, 2024 is a real UTC calendar date, and March 1 is a later instant.',
        snapshot: '2024-03-01', opening: '2024-02-29T23:59:59.999Z',
        resolution: '2024-03-01T00:00:00.000Z', expectedEligible: true,
        expectedClassification: 'verified', expectedCodes: [] },
    { id: 'non-leap-day', title: 'Impossible leap day',
        assumption: 'February 29, 2025 must not be silently normalized into March.',
        snapshot: '2025-03-01', opening: '2025-02-29T08:00:00.000Z',
        resolution: '2025-03-01T09:00:00.000Z', expectedEligible: false,
        expectedClassification: 'invalid', expectedCodes: ['INVALID_OPEN_EVENT', 'INVALID_EVENT_TIMESTAMP'] },
    { id: 'offset-opening', title: 'Offset-based opening time',
        assumption: 'An explicit +03:00 offset does not satisfy the canonical Z-only contract.',
        snapshot, opening: '2026-10-18T08:00:00+03:00', resolution,
        expectedEligible: false, expectedClassification: 'invalid',
        expectedCodes: ['INVALID_OPEN_EVENT', 'INVALID_EVENT_TIMESTAMP'] },
    { id: 'local-event', title: 'Timezone missing in event',
        assumption: 'An event without an explicit Z timezone is rejected even if the log timestamp is valid.',
        snapshot, opening, resolution, expectedEligible: true,
        expectedClassification: 'invalid', expectedCodes: ['INVALID_EVENT_TIMESTAMP'],
        change: row => { row.statusHistory[1].changedAt = '2026-10-18T09:00:00'; } },
    { id: 'year-boundary', title: 'Valid calendar year change',
        assumption: 'December 31 to January 1 must preserve chronological order across years.',
        snapshot: '2026-01-01', opening: '2025-12-31T23:59:59.999Z',
        resolution: '2026-01-01T00:00:00.000Z', expectedEligible: true,
        expectedClassification: 'verified', expectedCodes: [] },
    { id: 'future-opening', title: 'Future dated opening',
        assumption: 'The record and both events postdate the declared observation snapshot.',
        snapshot, opening: '2026-10-19T08:00:00.000Z',
        resolution: '2026-10-19T09:00:00.000Z', expectedEligible: false,
        expectedClassification: 'invalid', expectedCodes: ['AFTER_SNAPSHOT'] },
    { id: 'unrecorded', title: 'Missing timeline evidence',
        assumption: 'An unrecorded timeline is unknown rather than a failed chronological history.',
        snapshot, opening, resolution, expectedEligible: true,
        expectedClassification: 'unrecorded', expectedCodes: ['MISSING_HISTORY'],
        change: row => { row.statusHistory = []; } },
    { id: 'equal-transition-time', title: 'Simultaneous event timestamps',
        assumption: 'Consecutive statuses at the same UTC instant are permitted by the nondecreasing-time contract.',
        snapshot, opening, resolution, expectedEligible: true,
        expectedClassification: 'verified', expectedCodes: [],
        change: row => { row.statusHistory[1].changedAt = row.statusHistory[0].changedAt; } },
];

const makeRecord = (assetId: string, opened: string, resolved: string): BoundaryLog => ({
    id: 'TEMPORAL-SYNTHETIC-001', assetId, type: 'incident', status: 'resolved', date: opened,
    statusHistory: [
        { from: null, to: 'open', changedAt: opened, changedBy: 'Fictional operator' },
        { from: 'open', to: 'resolved', changedAt: resolved, changedBy: 'Fictional reviewer' },
    ],
});

export const buildTemporalBoundaryExperiments = (assets: DemoInsightAsset[]): TemporalBoundaryCase[] => {
    const asset = assets.find(entry => entry.id === 'A01' && entry.status !== 'decommissioned');
    if (!asset) throw new Error('Temporal boundary lab requires an in-service fictional A01');
    return designs.map(design => {
        const record = makeRecord(asset.id, design.opening, design.resolution);
        design.change?.(record);
        const trace = assessLifecycleTraceability([record], design.snapshot);
        const quality = assessDemoDataQuality(assets, [record], design.snapshot);
        const observedClassification: Classification = trace.verifiedHistory ? 'verified'
            : trace.missingHistory ? 'unrecorded' : 'invalid';
        const expectedCodes = [...design.expectedCodes].sort();
        const observedCodes = trace.issues.filter(issue => issue.count > 0)
            .map(issue => issue.code).sort();
        return {
            id: design.id, title: design.title, assumption: design.assumption,
            observationDateUTC: design.snapshot,
            expected: {
                eligible: design.expectedEligible,
                classification: design.expectedClassification,
                issueCodes: expectedCodes,
            },
            observed: {
                eligible: quality.eligibleRecords === 1,
                classification: observedClassification,
                issueCodes: observedCodes,
            },
            matchesExpected: quality.assessedRecords === 1 && trace.assessedRecords === 1 &&
                quality.eligibleRecords === (design.expectedEligible ? 1 : 0) &&
                observedClassification === design.expectedClassification &&
                JSON.stringify(observedCodes) === JSON.stringify(expectedCodes),
        };
    });
};
