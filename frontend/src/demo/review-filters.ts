import type { TraceabilityIssueCode } from './traceability';
import type { QualityFindingCode } from './quality';
import type { EvidenceMatrixRow } from './evidence-matrix';
import type { ReviewCategory, SyntheticReviewReport, SyntheticReviewRow } from './review-queue';

export type DiagnosticCode = QualityFindingCode | TraceabilityIssueCode;
export type ReviewHistory = EvidenceMatrixRow['history'];
export interface ReviewFilters {
    category: ReviewCategory | 'all';
    history: ReviewHistory | 'all';
    diagnostic: DiagnosticCode | 'all';
}
export interface DiagnosticFacet {
    code: DiagnosticCode;
    axis: 'basic-data' | 'history';
    rows: number;
}
export interface FilteredReview {
    matchedRows: SyntheticReviewRow[];
    matched: number;
    assessed: number;
}

export const ALL_REVIEW_FILTERS: Readonly<ReviewFilters> = {
    category: 'all',
    history: 'all',
    diagnostic: 'all',
};

/**
 * Count unique affected *rows* rather than total occurrences. The same
 * position may match both basic and history codes, so diagnostic facet
 * totals are NOT mutually exclusive and MUST NOT be summed.
 */
export const buildReviewDiagnosticFacets = (report: SyntheticReviewReport): DiagnosticFacet[] => {
    const facets = new Map<DiagnosticCode, DiagnosticFacet>();
    for (const row of report.rows) {
        for (const axis of ['basic-data', 'history'] as const) {
            const codes = axis === 'basic-data' ? row.qualityCodes : row.historyCodes;
            for (const code of new Set<DiagnosticCode>(codes)) {
                const prior = facets.get(code);
                if (prior && prior.axis !== axis) {
                    throw new Error('Synthetic diagnostic unexpectedly crosses independent axes');
                }
                facets.set(code, {
                    code,
                    axis,
                    rows: (prior?.rows ?? 0) + 1,
                });
            }
        }
    }
    return [...facets.values()].sort((a, b) =>
        (a.axis === b.axis ? 0 : a.axis === 'basic-data' ? -1 : 1) ||
        a.code.localeCompare(b.code));
};

/** Intersection is a view only; category membership and original rows are immutable. */
export const filterSyntheticReview = (
    report: SyntheticReviewReport, filters: ReviewFilters,
): FilteredReview => {
    const categoryAllowed = filters.category === 'all' ||
        report.categories.some(item => item.id === filters.category);
    const historyAllowed = ['all', 'verified', 'unrecorded', 'invalid']
        .includes(filters.history);
    const diagnosticAllowed = filters.diagnostic === 'all' ||
        buildReviewDiagnosticFacets(report).some(item => item.code === filters.diagnostic);
    if (!categoryAllowed || !historyAllowed || !diagnosticAllowed) {
        throw new Error('Unknown synthetic review filter option');
    }
    const matchedRows = report.rows.filter(row =>
        (filters.category === 'all' || row.category === filters.category) &&
        (filters.history === 'all' || row.history === filters.history) &&
        (filters.diagnostic === 'all' ||
            row.qualityCodes.includes(filters.diagnostic as QualityFindingCode) ||
            row.historyCodes.includes(filters.diagnostic as TraceabilityIssueCode)));
    return { matchedRows, matched: matchedRows.length, assessed: report.assessedRows };
};
