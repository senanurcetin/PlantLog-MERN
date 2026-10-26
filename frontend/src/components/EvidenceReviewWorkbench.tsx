import { useMemo, useState } from 'react';
import { buildEvidenceMatrix, buildEvidenceMatrixProbes } from '../demo/evidence-matrix';
import { buildSyntheticReviewQueue } from '../demo/review-queue';
import type { ReviewCategory } from '../demo/review-queue';
import { buildReviewDiagnosticFacets, filterSyntheticReview } from '../demo/review-filters';
import type { DiagnosticCode, ReviewHistory } from '../demo/review-filters';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';

const EvidenceReviewWorkbench = ({ assets, logs, snapshot }: {
    assets: DemoInsightAsset[];
    logs: DemoInsightLog[];
    snapshot: string;
}) => {
    const [population, setPopulation] = useState<'fixture' | 'probes'>('fixture');
    const [selected, setSelected] = useState<ReviewCategory | 'all'>('all');
    const [history, setHistory] = useState<ReviewHistory | 'all'>('all');
    const [diagnostic, setDiagnostic] = useState<DiagnosticCode | 'all'>('all');
    const resetFilters = () => {
        setSelected('all');
        setHistory('all');
        setDiagnostic('all');
    };
    const reports = useMemo(() => ({
        fixture: buildSyntheticReviewQueue(buildEvidenceMatrix(assets, logs, snapshot)),
        probes: buildSyntheticReviewQueue(buildEvidenceMatrixProbes(assets, logs, snapshot)),
    }), [assets, logs, snapshot]);
    const current = reports[population];
    const facets = useMemo(() => buildReviewDiagnosticFacets(current), [current]);
    const filtered = filterSyntheticReview(current, {
        category: selected, history, diagnostic,
    });
    const visibleRows = filtered.matchedRows;
    const selectedCategory = current.categories.find(item => item.id === selected);

    return (
        <section className="nexus-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6"
            aria-labelledby="evidence-workbench-heading">
            <h2 id="evidence-workbench-heading" className="text-lg font-bold text-slate-900">
                Synthetic evidence review workbench
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                A read-only document-review queue, derived from the six-cell
                evidence matrix. It orders data-check questions, not the urgency,
                operational condition or safety criticality of equipment.
                Nothing here creates, approves or authenticates a maintenance record.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group"
                aria-label="Synthetic review population">
                <button type="button" aria-pressed={population === 'fixture'}
                    onClick={() => { setPopulation('fixture'); resetFilters(); }}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-blue-600 ${population === 'fixture'
                            ? 'border-blue-900 bg-[#061524] text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-blue-50'}`}>
                    Current fictional sample
                </button>
                <button type="button" aria-pressed={population === 'probes'}
                    onClick={() => { setPopulation('probes'); resetFilters(); }}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:outline
                        focus-visible:outline-2 focus-visible:outline-blue-600 ${population === 'probes'
                            ? 'border-blue-900 bg-[#061524] text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-blue-50'}`}>
                    Six controlled cases
                </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
                aria-live="polite" aria-atomic="true">
                {[
                    { label: 'Rows assessed', value: current.assessedRows },
                    { label: 'Needs source review', value: current.requiresSourceReview },
                    { label: 'Internally consistent only', value: current.recordedConsistentRows },
                ].map(metric => <div key={metric.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600">{metric.label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{metric.value}</p>
                </div>)}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div>
                <label htmlFor="evidence-review-filter"
                    className="block text-sm font-semibold text-slate-800">
                    Filter by documentary review category
                </label>
                <select id="evidence-review-filter" value={selected}
                    onChange={event => setSelected(event.target.value as ReviewCategory | 'all')}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3
                        text-sm text-slate-900 focus-visible:outline focus-visible:outline-2
                        focus-visible:outline-blue-600">
                    <option value="all">All synthetic rows ({current.assessedRows})</option>
                    {current.categories.map(item => <option key={item.id} value={item.id}>
                        {item.title} ({item.rows})
                    </option>)}
                </select>
                <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                    {selectedCategory ? selectedCategory.guidance :
                        'Each row is listed once. Overlapping diagnostics remain visible.'}
                </p>
                </div>
                <div>
                    <label htmlFor="evidence-review-history"
                        className="block text-sm font-semibold text-slate-800">
                        Filter by original history assessment
                    </label>
                    <select id="evidence-review-history" value={history}
                        onChange={event =>
                            setHistory(event.target.value as ReviewHistory | 'all')}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3
                            text-sm text-slate-900 focus-visible:outline focus-visible:outline-2
                            focus-visible:outline-blue-600">
                        <option value="all">Any history assessment</option>
                        <option value="verified">Internally consistent</option>
                        <option value="unrecorded">Unrecorded</option>
                        <option value="invalid">Contradictory</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="evidence-review-diagnostic"
                        className="block text-sm font-semibold text-slate-800">
                        Filter by independent diagnostic
                    </label>
                    <select id="evidence-review-diagnostic" value={diagnostic}
                        onChange={event =>
                            setDiagnostic(event.target.value as DiagnosticCode | 'all')}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3
                            text-sm text-slate-900 focus-visible:outline focus-visible:outline-2
                            focus-visible:outline-blue-600">
                        <option value="all">Any diagnostic code</option>
                        {facets.map(facet => <option key={facet.code} value={facet.code}>
                            {facet.code} ({facet.rows} fictional row{facet.rows === 1 ? '' : 's'})
                        </option>)}
                    </select>
                    <p className="mt-2 text-xs text-slate-600">
                        Diagnostic totals overlap across axes. Never add them
                        to estimate distinct records.
                    </p>
                </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700" role="status"
                aria-live="polite">
                {filtered.matched} of {filtered.assessed} fictional rows match
                the combined filters. Original classifications are unchanged.
            </p>
            <div className="mt-4 w-full overflow-x-auto" role="region" tabIndex={0}
                aria-label="Filtered fictional documentary evidence review rows">
                <table className="w-full min-w-[580px] text-left text-sm">
                    <caption className="mb-2 text-left text-sm font-semibold text-slate-800">
                        {visibleRows.length} of {current.assessedRows} fictional rows displayed
                    </caption>
                    <thead className="bg-slate-50 text-slate-800">
                        <tr>
                            <th scope="col" className="p-3">Position</th>
                            <th scope="col" className="p-3">Documentary review question</th>
                            <th scope="col" className="p-3">Original history assessment</th>
                            <th scope="col" className="p-3">Unmodified diagnostic codes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visibleRows.map(row => <tr key={row.ordinal}>
                            <th scope="row" className="p-3 font-bold text-slate-900">
                                Row {row.ordinal}
                            </th>
                            <td className="p-3 text-slate-800">
                                {current.categories.find(item => item.id === row.category)?.title}
                            </td>
                            <td className="p-3 text-slate-800">
                                {row.history} / {row.qualityEligible ? 'eligible' : 'excluded'}
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-700">
                                {[...row.qualityCodes, ...row.historyCodes].join(', ') || 'None'}
                            </td>
                        </tr>)}
                    </tbody>
                </table>
                {visibleRows.length === 0 && (
                    <p className="p-3 text-sm text-slate-600" role="status">
                        No fictional row matches all selected documentary checks.
                        Change a filter to compare another intersection.
                    </p>
                )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">{current.caveat}</p>
        </section>
    );
};

export default EvidenceReviewWorkbench;
