import { useState } from 'react';
import { buildEligibilitySensitivity } from '../demo/sensitivity';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';

const EligibilitySensitivityLab = ({ assets, logs, snapshot }: {
    assets: DemoInsightAsset[];
    logs: DemoInsightLog[];
    snapshot: string;
}) => {
    const [selected, setSelected] = useState('baseline');
    const cases = buildEligibilitySensitivity(assets, logs, snapshot);
    const current = cases.find(item => item.id === selected) || cases[0];
    return (
        <section className="nexus-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6"
            aria-labelledby="eligibility-lab-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                    <h2 id="eligibility-lab-heading" className="text-lg font-bold text-slate-900">
                        Scientific sensitivity lab: raw versus eligible records
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Five independently reconstructed fictional datasets, each starting from
                        the same unchanged fixture. Select a data defect to see how quality
                        rules affect reported workload. This is a reproducible bookkeeping
                        exercise, not an equipment failure prediction or causal experiment.
                    </p>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                    In-memory / synthetic only
                </span>
            </div>
            <div role="group" aria-label="Select synthetic data-quality sensitivity case"
                className="mt-5 flex flex-wrap gap-2">
                {cases.map(item => (
                    <button type="button" key={item.id} aria-pressed={item.id === current.id}
                        onClick={() => setSelected(item.id)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors
                            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                                item.id === current.id
                                    ? 'border-blue-800 bg-[#061524] text-white'
                                    : 'border-slate-300 bg-white text-slate-800 hover:bg-blue-50'
                            }`}>
                        {item.title}
                    </button>
                ))}
            </div>
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
                    Assumption: {current.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{current.assumption}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { name: 'Raw rows', value: current.assessed },
                        { name: 'Eligible rows', value: current.eligible },
                        { name: 'Excluded rows', value: current.excluded },
                        { name: 'Overlapping issue counts', value: current.findings.reduce((total, finding) => total + finding.count, 0) },
                    ].map(metric => (
                        <div key={metric.name} className="rounded-lg border border-white bg-white p-3">
                            <p className="text-xs text-slate-600">{metric.name}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{metric.value}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-5 w-full overflow-x-auto" role="region" tabIndex={0}
                aria-label="Raw and eligible fictional workload comparison table, horizontally scrollable">
                <table className="w-full min-w-[500px] text-left text-sm">
                    <caption className="sr-only">
                        Effect of independently simulated data defects on raw and eligible fictional workload totals
                    </caption>
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
                        <tr>
                            <th className="p-3" scope="col">Reported quantity</th>
                            <th className="p-3 text-right" scope="col">Raw</th>
                            <th className="p-3 text-right" scope="col">Eligible</th>
                            <th className="p-3 text-right" scope="col">Raw minus eligible</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {[
                            { name: 'Unresolved incident / maintenance entries',
                                raw: current.rawOpenCases, eligible: current.eligibleOpenCases },
                            { name: 'Unlinked unresolved cases',
                                raw: current.rawUnlinkedCases, eligible: current.eligibleUnlinkedCases },
                        ].map(row => (
                            <tr key={row.name}>
                                <th className="p-3 font-semibold text-slate-800" scope="row">{row.name}</th>
                                <td className="p-3 text-right tabular-nums">{row.raw}</td>
                                <td className="p-3 text-right tabular-nums">{row.eligible}</td>
                                <td className="p-3 text-right font-bold tabular-nums text-blue-900">
                                    {row.raw - row.eligible}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div aria-live="polite" className="mt-4 text-sm text-slate-700">
                <p className="font-semibold">
                    {current.findings.length
                        ? 'Triggered audit gates'
                        : 'No triggered quality gates'}
                </p>
                {current.findings.length > 0 && (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {current.findings.map(finding => (
                            <li key={finding.code} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <span className="font-semibold text-slate-900">{finding.code}</span>
                                <span className="ml-2 font-bold tabular-nums">{finding.count}</span>
                                <span className="mt-1 block text-xs text-slate-600">{finding.meaning}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <p className="mt-4 text-xs text-slate-600">
                The raw dashboard intentionally remains a descriptive view of all fixture records;
                the eligible column is recalculated using the same quality rules shown above.
                Several findings can affect one row, so issue counts are not equivalent to the
                number of excluded records. The original fixture is never mutated or saved.
            </p>
        </section>
    );
};

export default EligibilitySensitivityLab;
