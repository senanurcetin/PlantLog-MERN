import { isCanonicalDemoTimestamp } from './quality';
import type { DemoInsightLog } from './insights';

export type TraceabilityIssueCode =
    | 'MISSING_HISTORY'
    | 'INVALID_HISTORY_SHAPE'
    | 'INVALID_OPEN_EVENT'
    | 'INVALID_TRANSITION'
    | 'INVALID_EVENT_TIMESTAMP'
    | 'NON_MONOTONIC_TIME'
    | 'AFTER_SNAPSHOT'
    | 'MISSING_ACTOR'
    | 'FINAL_STATE_MISMATCH';

export interface TraceabilityIssue {
    code: TraceabilityIssueCode;
    count: number;
}

export interface TraceabilityReport {
    assessedRecords: number;
    verifiedHistory: number;
    missingHistory: number;
    invalidHistory: number;
    observedHistoryEvents: number;
    issues: TraceabilityIssue[];
    caveat: string;
}

type TraceableLog = DemoInsightLog & { statusHistory?: unknown };
const nextStates: Record<string, readonly string[]> = {
    open: ['acknowledged', 'resolved'],
    acknowledged: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
};
const issueOrder: TraceabilityIssueCode[] = [
    'MISSING_HISTORY', 'INVALID_HISTORY_SHAPE', 'INVALID_OPEN_EVENT',
    'INVALID_TRANSITION', 'INVALID_EVENT_TIMESTAMP', 'NON_MONOTONIC_TIME',
    'AFTER_SNAPSHOT', 'MISSING_ACTOR', 'FINAL_STATE_MISMATCH',
];

/**
 * A second, independent evidence axis: lifecycle traceability.
 * Missing history is UNVERIFIABLE, never silently treated as verified or
 * mistaken for a corrupted timeline. It does not change workload eligibility.
 * Every issue count is per affected record, not per transition or unique defect.
 */
export const assessLifecycleTraceability = (
    logs: TraceableLog[], snapshot: string,
): TraceabilityReport => {
    const endText = snapshot + 'T23:59:59.999Z';
    if (!isCanonicalDemoTimestamp(endText)) {
        throw new Error('Invalid UTC traceability snapshot');
    }
    const end = Date.parse(endText);
    const counts = new Map<TraceabilityIssueCode, number>(
        issueOrder.map(code => [code, 0]),
    );
    let verifiedHistory = 0;
    let missingHistory = 0;
    let invalidHistory = 0;
    let observedHistoryEvents = 0;

    for (const log of logs) {
        const history = log.statusHistory;
        if (history == null || (Array.isArray(history) && history.length === 0)) {
            missingHistory++;
            counts.set('MISSING_HISTORY', counts.get('MISSING_HISTORY')! + 1);
            continue;
        }
        const issues = new Set<TraceabilityIssueCode>();
        if (!Array.isArray(history)) {
            issues.add('INVALID_HISTORY_SHAPE');
        } else {
            observedHistoryEvents += history.length;
            let previousState: string | null = null;
            let previousTime: number | null = null;
            const recordDate = isCanonicalDemoTimestamp(log.date)
                ? Date.parse(log.date) : null;

            history.forEach((value: unknown, index: number) => {
                if (typeof value !== 'object' || value === null ||
                    Array.isArray(value)) {
                    issues.add('INVALID_HISTORY_SHAPE');
                    return;
                }
                const event = value as Record<string, unknown>;
                if (typeof event.changedBy !== 'string' || !event.changedBy.trim()) {
                    issues.add('MISSING_ACTOR');
                }
                const changedAt = isCanonicalDemoTimestamp(event.changedAt)
                    ? Date.parse(event.changedAt) : null;
                if (changedAt === null) {
                    issues.add('INVALID_EVENT_TIMESTAMP');
                } else {
                    if (changedAt > end) issues.add('AFTER_SNAPSHOT');
                    if (previousTime !== null && changedAt < previousTime) {
                        issues.add('NON_MONOTONIC_TIME');
                    }
                    previousTime = changedAt;
                }

                if (index === 0) {
                    if (event.from !== null || event.to !== 'open' ||
                        recordDate === null || changedAt !== recordDate) {
                        issues.add('INVALID_OPEN_EVENT');
                    }
                } else if (event.from !== previousState ||
                    typeof event.to !== 'string' ||
                    !nextStates[previousState ?? '']?.includes(event.to as string)) {
                    issues.add('INVALID_TRANSITION');
                }
                previousState = typeof event.to === 'string' ? event.to : null;
            });
            const last = history[history.length - 1];
            if (typeof last !== 'object' || last === null ||
                Array.isArray(last) ||
                (last as Record<string, unknown>).to !== log.status ||
                !Object.prototype.hasOwnProperty.call(nextStates, log.status)) {
                issues.add('FINAL_STATE_MISMATCH');
            }
        }

        if (issues.size > 0) {
            invalidHistory++;
            for (const code of issues) counts.set(code, counts.get(code)! + 1);
        } else {
            verifiedHistory++;
        }
    }
    return {
        assessedRecords: logs.length,
        verifiedHistory,
        missingHistory,
        invalidHistory,
        observedHistoryEvents,
        issues: issueOrder.map(code => ({ code, count: counts.get(code)! })),
        caveat: 'This checks only the internal consistency of fictional status histories. ' +
            'Missing histories are unverified, not invented or counted as faulty. ' +
            'Even verified sample events are not independent evidence of work performed, ' +
            'equipment uptime, downtime, MTTR, MTBF or industrial safety.',
    };
};
