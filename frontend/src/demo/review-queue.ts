import type { EvidenceMatrixReport, EvidenceMatrixRow } from './evidence-matrix';

export type ReviewCategory =
    | 'basic-data'
    | 'history-conflict'
    | 'history-unrecorded'
    | 'recorded-consistent';

export interface SyntheticReviewCategory {
    id: ReviewCategory;
    title: string;
    guidance: string;
    rows: number;
}

export interface SyntheticReviewRow extends EvidenceMatrixRow {
    category: ReviewCategory;
    guidance: string;
}

export interface SyntheticReviewReport {
    assessedRows: number;
    requiresSourceReview: number;
    recordedConsistentRows: number;
    categories: SyntheticReviewCategory[];
    rows: SyntheticReviewRow[];
    caveat: string;
}

const reviewCategories: ReadonlyArray<Omit<SyntheticReviewCategory, 'rows'>> = [
    {
        id: 'basic-data',
        title: 'Resolve basic data contradictions',
        guidance: 'Inspect missing, duplicate, unlinked or invalid base fields before relying on this row.',
    },
    {
        id: 'history-conflict',
        title: 'Investigate contradictory event history',
        guidance: 'Compare the fictional transition chain with its documented status and timestamps.',
    },
    {
        id: 'history-unrecorded',
        title: 'Request missing history evidence',
        guidance: 'History is unknown; do not infer transitions, technician actions or repair durations.',
    },
    {
        id: 'recorded-consistent',
        title: 'Internally consistent sample',
        guidance: 'The recorded chain is self-consistent, not independently authenticated.',
    },
];

/** Review order is a *data-check* order, NEVER a safety, asset-risk or dispatch priority. */
export const classifyReviewCategory = (row: EvidenceMatrixRow): ReviewCategory =>
    !row.qualityEligible ? 'basic-data'
        : row.history === 'invalid' ? 'history-conflict'
            : row.history === 'unrecorded' ? 'history-unrecorded'
                : 'recorded-consistent';

/**
 * Create a read-only, anonymous reviewer worklist from the already checked
 * dual-axis matrix. The function does not update or "approve" any row.
 * Preserve all independent diagnostics even where one category takes precedence.
 */
export const buildSyntheticReviewQueue = (matrix: EvidenceMatrixReport): SyntheticReviewReport => {
    if (!Number.isSafeInteger(matrix.assessedRows) || matrix.assessedRows < 0 ||
        !Array.isArray(matrix.rowAssessments) ||
        matrix.rowAssessments.length !== matrix.assessedRows ||
        !Array.isArray(matrix.cells) || matrix.cells.length !== 6) {
        throw new Error('Invalid synthetic evidence matrix population');
    }
    const seen = new Set<number>();
    const counts = new Map<ReviewCategory, number>(
        reviewCategories.map(item => [item.id, 0]),
    );
    const rows = matrix.rowAssessments.map((row): SyntheticReviewRow => {
        if (!Number.isSafeInteger(row.ordinal) || row.ordinal < 1 ||
            row.ordinal > matrix.assessedRows || seen.has(row.ordinal) ||
            row.qualityEligible !== (row.qualityCodes.length === 0) ||
            (row.history === 'verified' ? row.historyCodes.length !== 0
                : row.historyCodes.length === 0) ||
            !['verified', 'unrecorded', 'invalid'].includes(row.history)) {
            throw new Error('Invalid or repeated synthetic review row');
        }
        seen.add(row.ordinal);
        const category = classifyReviewCategory(row);
        const definition = reviewCategories.find(item => item.id === category)!;
        counts.set(category, counts.get(category)! + 1);
        return {
            ordinal: row.ordinal,
            qualityEligible: row.qualityEligible,
            history: row.history,
            qualityCodes: [...row.qualityCodes],
            historyCodes: [...row.historyCodes],
            category,
            guidance: definition.guidance,
        };
    });
    const cellTotal = matrix.cells.reduce((sum, cell) => {
        if (!Number.isSafeInteger(cell.rows) || cell.rows < 0) {
            throw new Error('Invalid synthetic evidence cell');
        }
        return sum + cell.rows;
    }, 0);
    const excluded = rows.filter(row => !row.qualityEligible).length;
    const verified = rows.filter(row => row.history === 'verified').length;
    const missing = rows.filter(row => row.history === 'unrecorded').length;
    const invalid = rows.filter(row => row.history === 'invalid').length;
    if (cellTotal !== matrix.assessedRows ||
        excluded !== matrix.excludedRows ||
        matrix.eligibleRows !== matrix.assessedRows - excluded ||
        verified !== matrix.recordedAndVerifiedRows ||
        missing !== matrix.unrecordedHistoryRows ||
        invalid !== matrix.invalidHistoryRows ||
        matrix.cells.some(cell => rows.filter(row =>
            row.qualityEligible === cell.qualityEligible &&
            row.history === cell.history).length !== cell.rows)) {
        throw new Error('Synthetic review counts differ from the independent evidence matrix');
    }
    const orderedRows = rows.sort((a, b) =>
        reviewCategories.findIndex(category => category.id === a.category) -
        reviewCategories.findIndex(category => category.id === b.category) ||
        a.ordinal - b.ordinal);
    const categories = reviewCategories.map(definition => ({
        ...definition,
        rows: counts.get(definition.id)!,
    }));
    const recordedConsistentRows = counts.get('recorded-consistent')!;
    const requiresSourceReview = matrix.assessedRows - recordedConsistentRows;
    return {
        assessedRows: matrix.assessedRows,
        requiresSourceReview,
        recordedConsistentRows,
        categories,
        rows: orderedRows,
        caveat: 'An illustrative document-review queue, not plant safety priority, ' +
            'dispatch urgency, acceptance status or a work order. All fictional rows ' +
            'retain their original eligibility and history diagnostics. A consistent ' +
            'stored timeline cannot prove a real intervention occurred.',
    };
};
