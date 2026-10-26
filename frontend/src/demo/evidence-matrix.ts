import { assessDemoDataQuality } from './quality';
import type { QualityFindingCode } from './quality';
import { assessLifecycleTraceability } from './traceability';
import type { TraceabilityIssueCode, TraceabilityRowAssessment } from './traceability';
import type { DemoInsightAsset, DemoInsightLog } from './insights';

type HistoryStatus = TraceabilityRowAssessment['classification'];
type SyntheticLog = DemoInsightLog & { id?: string; statusHistory?: unknown };

export interface EvidenceMatrixCell {
    qualityEligible: boolean;
    history: HistoryStatus;
    rows: number;
}

export interface EvidenceMatrixRow {
    /** One-based position only. Deliberately contains no raw record or person identifiers. */
    ordinal: number;
    qualityEligible: boolean;
    history: HistoryStatus;
    qualityCodes: QualityFindingCode[];
    historyCodes: TraceabilityIssueCode[];
}

export interface EvidenceMatrixReport {
    assessedRows: number;
    eligibleRows: number;
    excludedRows: number;
    recordedAndVerifiedRows: number;
    unrecordedHistoryRows: number;
    invalidHistoryRows: number;
    cells: EvidenceMatrixCell[];
    rowAssessments: EvidenceMatrixRow[];
    caveat: string;
}

const historyOrder: readonly HistoryStatus[] = ['verified', 'unrecorded', 'invalid'];
const expectedCells = (eligible: boolean, history: HistoryStatus): string =>
    (eligible ? 'eligible:' : 'excluded:') + history;

/**
 * Join the two independent auditors only by positional row index.
 * Never match by IDs: repeated or missing IDs are precisely why some input
 * rows are excluded. No personal fields or source timestamps are returned.
 */
export const buildEvidenceMatrix = (
    assets: DemoInsightAsset[], logs: SyntheticLog[], snapshot: string,
): EvidenceMatrixReport => {
    const quality = assessDemoDataQuality(assets, logs, snapshot);
    const history = assessLifecycleTraceability(logs, snapshot);
    if (quality.assessedRecords !== logs.length ||
        history.assessedRecords !== logs.length ||
        quality.rowAssessments.length !== logs.length ||
        history.rowAssessments.length !== logs.length) {
        throw new Error('Synthetic evidence auditors disagree on assessed population');
    }
    const cells: EvidenceMatrixCell[] = [true, false].flatMap(eligible =>
        historyOrder.map(classification =>
            ({ qualityEligible: eligible, history: classification, rows: 0 })));
    const byCell = new Map(cells.map(cell =>
        [expectedCells(cell.qualityEligible, cell.history), cell]));
    const rows = quality.rowAssessments.map((record, index): EvidenceMatrixRow => {
        const timeline = history.rowAssessments[index];
        if (record.index !== index || timeline.index !== index ||
            record.eligible !== (record.codes.length === 0) ||
            (timeline.classification === 'verified' ? timeline.codes.length !== 0
                : timeline.codes.length === 0)) {
            throw new Error('Synthetic evidence row diagnostics failed reconciliation');
        }
        const cell = byCell.get(expectedCells(record.eligible, timeline.classification));
        if (!cell) throw new Error('Unexpected synthetic evidence category');
        cell.rows++;
        return {
            ordinal: index + 1,
            qualityEligible: record.eligible,
            history: timeline.classification,
            qualityCodes: [...record.codes],
            historyCodes: [...timeline.codes],
        };
    });
    const eligibleRows = cells.filter(cell => cell.qualityEligible)
        .reduce((sum, cell) => sum + cell.rows, 0);
    const unrecordedHistoryRows = cells.filter(cell => cell.history === 'unrecorded')
        .reduce((sum, cell) => sum + cell.rows, 0);
    const invalidHistoryRows = cells.filter(cell => cell.history === 'invalid')
        .reduce((sum, cell) => sum + cell.rows, 0);
    const recordedAndVerifiedRows = cells.filter(cell => cell.history === 'verified')
        .reduce((sum, cell) => sum + cell.rows, 0);
    if (eligibleRows !== quality.eligibleRecords ||
        recordedAndVerifiedRows !== history.verifiedHistory ||
        unrecordedHistoryRows !== history.missingHistory ||
        invalidHistoryRows !== history.invalidHistory ||
        cells.reduce((sum, cell) => sum + cell.rows, 0) !== logs.length ||
        rows.filter(row => row.qualityEligible).map(row => row.ordinal - 1)
            .some((index, i) => index !== quality.eligibleRecordIndices[i])) {
        throw new Error('Two-axis synthetic evidence totals do not reconcile');
    }
    return {
        assessedRows: logs.length,
        eligibleRows,
        excludedRows: logs.length - eligibleRows,
        recordedAndVerifiedRows,
        unrecordedHistoryRows,
        invalidHistoryRows,
        cells,
        rowAssessments: rows,
        caveat: 'Each fictional row is counted once in exactly one of six cells. ' +
            'Basic eligibility and history provenance are separate dimensions; ' +
            'neither is proof of actual work, field measurements or risk. ' +
            'Diagnostic reasons may overlap, especially for duplicated IDs; ' +
            'raw workload charts still include all fictional records.',
    };
};

/**
 * Six mutually exclusive examples exercise every axis intersection.
 * This starts from a documented, internally consistent synthetic history and
 * constructs six independent copies; does not modify the original fixture.
 */
export const buildEvidenceMatrixProbes = (
    assets: DemoInsightAsset[], logs: SyntheticLog[], snapshot: string,
): EvidenceMatrixReport => {
    const source = logs.find(row => row.id === 'L007');
    if (!source || !Array.isArray(source.statusHistory) ||
        assessLifecycleTraceability([source], snapshot).verifiedHistory !== 1 ||
        assessDemoDataQuality(assets, [source], snapshot).eligibleRecords !== 1) {
        throw new Error('Evidence matrix needs the verified fictional L007 reference');
    }
    const unlinkedAsset = '__MATRIX_NO_MATCH__';
    if (assets.some(asset => asset.id === unlinkedAsset)) {
        throw new Error('Synthetic missing-link identifier unexpectedly exists');
    }
    const six: SyntheticLog[] = [];
    for (const excluded of [false, true]) {
        for (const classification of historyOrder) {
            const row = JSON.parse(JSON.stringify(source)) as SyntheticLog;
            row.id = 'MATRIX-' + String(six.length + 1).padStart(3, '0');
            if (excluded) row.assetId = unlinkedAsset;
            if (classification === 'unrecorded') row.statusHistory = [];
            if (classification === 'invalid') {
                const history = row.statusHistory as Array<{ from: string | null }>;
                history[1].from = 'resolved';
            }
            six.push(row);
        }
    }
    const report = buildEvidenceMatrix(assets, six, snapshot);
    if (report.assessedRows !== 6 || report.cells.some(cell => cell.rows !== 1)) {
        throw new Error('Six synthetic evidence probes failed to span the category matrix');
    }
    return report;
};
