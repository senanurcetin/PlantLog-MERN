import { assessLifecycleTraceability } from './traceability';
import type { TraceabilityIssueCode } from './traceability';
import { assessDemoDataQuality } from './quality';
import type { DemoInsightAsset, DemoInsightLog } from './insights';

type TraceableRecord = DemoInsightLog & { id?: string; statusHistory?: unknown };
type Event = { from: string | null; to: string; changedAt: string; changedBy: string };

export interface LifecycleFaultCase {
    id: string;
    title: string;
    assumption: string;
    classification: 'verified' | 'unrecorded' | 'invalid';
    eligibleByIndependentQualityGates: number;
    observedTransitions: number;
    issues: Array<{ code: TraceabilityIssueCode; count: number }>;
}

interface FaultDesign {
    id: string;
    title: string;
    assumption: string;
    change: (log: TraceableRecord, nextDayUTC: string) => void;
}

const history = (log: TraceableRecord): Event[] => log.statusHistory as Event[];
const designs: readonly FaultDesign[] = [
    { id: 'baseline', title: 'Reference timeline',
        assumption: 'Unmodified fictional hydraulic-maintenance event chain.',
        change: () => {} },
    { id: 'unrecorded', title: 'Unrecorded history',
        assumption: 'Remove the stored history; absence is unknown, not a failed transition.',
        change: log => { log.statusHistory = []; } },
    { id: 'shape', title: 'Wrong history type',
        assumption: 'Replace the transition array with a non-array value.',
        change: log => { log.statusHistory = 'invalid-array-shape'; } },
    { id: 'opening', title: 'Contradictory opening',
        assumption: 'Change the first predecessor from null to resolved.',
        change: log => { history(log)[0].from = 'resolved'; } },
    { id: 'transition', title: 'Broken predecessor',
        assumption: 'Claim the in-progress event came directly from open.',
        change: log => { history(log)[2].from = 'open'; } },
    { id: 'timestamp', title: 'Impossible UTC date',
        assumption: 'Replace a transition timestamp with impossible 30 February.',
        change: log => { history(log)[1].changedAt = '2026-02-30T12:00:00Z'; } },
    { id: 'ordering', title: 'Backwards event time',
        assumption: 'Place the third event before the second event without reordering entries.',
        change: log => { history(log)[2].changedAt = history(log)[0].changedAt; } },
    { id: 'future', title: 'After observation date',
        assumption: 'Move the final event beyond the immutable fictional observation date.',
        change: (log, nextDayUTC) => { history(log)[3].changedAt = nextDayUTC; } },
    { id: 'actor', title: 'Unattributed event',
        assumption: 'Remove the actor field content from a transition.',
        change: log => { history(log)[2].changedBy = ' '; } },
    { id: 'final', title: 'State disagreement',
        assumption: 'Make the row status open while the final event remains resolved.',
        change: log => { log.status = 'open'; } },
    { id: 'overlap', title: 'Overlapping contradictions',
        assumption: 'Independently introduce a broken predecessor, missing actor, future event and final-status mismatch in the same row.',
        change: (log, nextDayUTC) => {
            history(log)[2].from = 'open';
            history(log)[2].changedBy = '';
            history(log)[3].changedAt = nextDayUTC;
            log.status = 'open';
        } },
];

/**
 * Explicit deterministic fault injection into a COPY of one documented
 * fictional lifecycle. Every case starts from the same exact reference row.
 * No mutation of the checked-in fixture or real operating history.
 */
export const buildLifecycleFaultExperiments = (
    assets: DemoInsightAsset[], logs: TraceableRecord[], snapshot: string,
): LifecycleFaultCase[] => {
    const source = logs.find(log => log.id === 'L007');
    if (!source || !Array.isArray(source.statusHistory) ||
        source.statusHistory.length !== 4 ||
        assessLifecycleTraceability([source], snapshot).verifiedHistory !== 1 ||
        assessDemoDataQuality(assets, [source], snapshot).eligibleRecords !== 1) {
        throw new Error('The documented synthetic L007 reference timeline is unavailable or invalid');
    }
    const nextDayUTC = new Date(Date.parse(snapshot + 'T00:00:00.000Z') + 86400000)
        .toISOString();
    return designs.map(design => {
        const changed = JSON.parse(JSON.stringify(source)) as TraceableRecord;
        design.change(changed, nextDayUTC);
        const result = assessLifecycleTraceability([changed], snapshot);
        const quality = assessDemoDataQuality(assets, [changed], snapshot);
        if (result.assessedRecords !== 1 ||
            result.verifiedHistory + result.missingHistory + result.invalidHistory !== 1) {
            throw new Error('Synthetic fault experiment failed category reconciliation');
        }
        const classification: LifecycleFaultCase['classification'] = result.verifiedHistory
            ? 'verified' : result.missingHistory ? 'unrecorded' : 'invalid';
        return {
            id: design.id,
            title: design.title,
            assumption: design.assumption,
            classification,
            eligibleByIndependentQualityGates: quality.eligibleRecords,
            observedTransitions: result.observedHistoryEvents,
            issues: result.issues.filter(issue => issue.count > 0),
        };
    });
};
