import { useMemo, useState } from 'react';
import { buildEvidenceMatrix, buildEvidenceMatrixProbes } from '../demo/evidence-matrix';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';

const historyStates = [
    { key: 'verified', label: 'Internally consistent' },
    { key: 'unrecorded', label: 'Not recorded' },
    { key: 'invalid', label: 'Contradictory' },
] as const;

const EvidenceMatrixLab = ({ assets, logs, snapshot }: {
    assets: DemoInsightAsset[];
    logs: DemoInsightLog[];
    snapshot: string;
}) => {
    const [dataset, setDataset] = useState<'fixture' | 'probes'>('fixture');
    const matrix = useMemo(() => ({
        fixture: buildEvidenceMatrix(assets, logs, snapshot),
        probes: buildEvidenceMatrixProbes(assets, logs, snapshot),
    }), [assets, logs, snapshot]);
    const report = matrix[dataset];
    return (
        <section className="nexus-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6"
            aria-labelledby="evidence-matrix-heading">
            <h2 id="evidence-matrix-heading" className="text-lg font-bold text-slate-900">
                Dual-axis evidence and eligibility matrix
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Distinguish basic row validity from recorded lifecycle traceability.
                The six cells partition every fictional entry exactly once.
                An eligible record is not necessarily supported by a documented,
                internally consistent status history.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group"
                aria-label="Choose the fictional evidence population">
                <button type="button" aria-pressed={dataset === 'fixture'}
                    onClick={() => setDataset('fixture')}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-blue-600 ${dataset === 'fixture'
                            ? 'border-blue-900 bg-[#061524] text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-blue-50'}`}>
                    Current fictional records
                </button>
                <button type="button" aria-pressed={dataset === 'probes'}
                    onClick={() => setDataset('probes')}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold
                        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-blue-600 ${dataset === 'probes'
                            ? 'border-blue-900 bg-[#061524] text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-blue-50'}`}>
                    Six controlled contradictions
                </button>
            </div>
            <p className="mt-3 text-xs text-slate-600">
                {dataset === 'fixture'
                    ? 'The original fictional sample, including any transient scenario entry.'
                    : 'Six independent synthetic copies of one documented case; each cell is deliberately populated once.'}
            </p>
            <div aria-live="polite" aria-atomic="true"
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { name: 'Rows assessed', value: report.assessedRows },
                    { name: 'Basic eligible', value: report.eligibleRows },
                    { name: 'Basic excluded', value: report.excludedRows },
                    { name: 'Unrecorded timelines', value: report.unrecordedHistoryRows },
                ].map(metric => <div key={metric.name}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-600">{metric.name}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                        {metric.value}
                    </p>
                </div>)}
            </div>
            <div className="mt-5 w-full overflow-x-auto" role="region" tabIndex={0}
                aria-label="Synthetic evidence by basic eligibility and lifecycle status">
                <table className="w-full min-w-[510px] text-left text-sm">
                    <caption className="sr-only">
                        Two eligibility rows by three lifecycle evidence classifications,
                        with each fictional record counted once
                    </caption>
                    <thead>
                        <tr className="bg-slate-50 text-slate-800">
                            <th scope="col" className="p-3">Basic eligibility</th>
                            {historyStates.map(item => <th key={item.key}
                                scope="col" className="p-3 text-right">{item.label}</th>)}
                            <th scope="col" className="p-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {[true, false].map(eligible => {
                            const cells = historyStates.map(state =>
                                report.cells.find(cell => cell.qualityEligible === eligible &&
                                    cell.history === state.key));
                            return <tr key={String(eligible)}>
                                <th scope="row" className="p-3 font-semibold text-slate-800">
                                    {eligible ? 'Eligible' : 'Excluded'}
                                </th>
                                {cells.map((cell, index) => <td key={historyStates[index].key}
                                    className="p-3 text-right tabular-nums text-slate-900">
                                    {cell?.rows ?? 0}
                                </td>)}
                                <td className="p-3 text-right font-bold tabular-nums text-slate-900">
                                    {cells.reduce((sum, cell) => sum + (cell?.rows ?? 0), 0)}
                                </td>
                            </tr>;
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-5 w-full overflow-x-auto" role="region" tabIndex={0}
                aria-label="Individual fictional row classifications and diagnostic reasons">
                <table className="w-full min-w-[610px] text-left text-sm">
                    <caption className="mb-2 text-left text-sm font-bold text-slate-800">
                        Row-level decision ledger (synthetic row positions only)
                    </caption>
                    <thead className="bg-slate-50 text-slate-700">
                        <tr>
                            <th scope="col" className="p-3">Position</th>
                            <th scope="col" className="p-3">Basic eligibility</th>
                            <th scope="col" className="p-3">Lifecycle status</th>
                            <th scope="col" className="p-3">Independent diagnostic codes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {report.rowAssessments.map(row => <tr key={row.ordinal}>
                            <th scope="row" className="p-3 font-semibold text-slate-800">
                                Row {row.ordinal}
                            </th>
                            <td className="p-3">{row.qualityEligible ? 'Eligible' : 'Excluded'}</td>
                            <td className="p-3 capitalize">{row.history}</td>
                            <td className="p-3 font-mono text-xs text-slate-700">
                                {[...row.qualityCodes, ...row.historyCodes].join(', ') || 'None'}
                            </td>
                        </tr>)}
                    </tbody>
                </table>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">
                {report.caveat} The two checks share record positions but do not
                infer authorship or event authenticity. Row numbers deliberately
                replace raw log IDs, equipment details and personnel names.
                Controlled contradictions are generated in browser memory only.
            </p>
        </section>
    );
};

export default EvidenceMatrixLab;
