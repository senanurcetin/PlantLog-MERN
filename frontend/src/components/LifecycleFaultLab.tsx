import { useState } from 'react';
import { buildLifecycleFaultExperiments } from '../demo/traceability-experiments';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';

const LifecycleFaultLab = ({ assets, logs, snapshot }: {
    assets: DemoInsightAsset[];
    logs: DemoInsightLog[];
    snapshot: string;
}) => {
    const [selected, setSelected] = useState('baseline');
    const experiments = buildLifecycleFaultExperiments(assets, logs, snapshot);
    const current = experiments.find(item => item.id === selected) || experiments[0];
    const description = current.classification === 'verified'
        ? 'Recorded status events are internally consistent; this does not verify real work.'
        : current.classification === 'unrecorded'
            ? 'No stored status-event timeline: provenance is unknown, not a failed event.'
            : 'The supplied fictional status-event timeline has one or more contradictions.';

    return (
        <section className="nexus-card min-w-0 max-w-full p-5 sm:p-6"
            aria-labelledby="lifecycle-fault-heading">
            <h2 id="lifecycle-fault-heading" className="text-lg font-bold text-slate-900">
                Lifecycle evidence fault-injection lab
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Eleven deterministic variations of the same fictional hydraulic maintenance
                example. Select a deliberate defect to see which timeline checks detect it.
                The original sample is copied before every experiment; no event, account,
                device or backend is changed.
            </p>
            <div className="mt-4 max-w-md">
                <label htmlFor="lifecycle-fault-case"
                    className="block text-sm font-semibold text-slate-800">
                    Fictional experiment
                </label>
                <select id="lifecycle-fault-case" value={current.id}
                    onChange={event => setSelected(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                    {experiments.map(item => (
                        <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                </select>
            </div>
            <div aria-live="polite" aria-atomic="true"
                className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <h3 className="font-bold text-slate-900">{current.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{current.assumption}</p>
                <p className="mt-2 text-sm text-slate-700">{description}</p>
                <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">Timeline classification</dt>
                        <dd className="mt-1 text-base font-bold capitalize text-slate-900">
                            {current.classification}
                        </dd>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">Triggered history checks</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                            {current.issues.length} / 9
                        </dd>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">Basic data eligibility</dt>
                        <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                            {current.eligibleByIndependentQualityGates} / 1
                        </dd>
                    </div>
                </dl>
            </div>
            <div className="mt-4">
                <p className="text-sm font-semibold text-slate-800">
                    {current.issues.length ? 'Observed diagnostic codes' : 'No timeline diagnostic triggered'}
                </p>
                {current.issues.length > 0 && (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Triggered fictional history diagnostics">
                        {current.issues.map(issue => (
                            <li key={issue.code}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                                <span className="font-semibold text-slate-900">{issue.code}</span>
                                <span className="ml-2 tabular-nums text-slate-700">
                                    {issue.count} fictional row
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">
                Timeline traceability is independent of the eight basic quality gates.
                Missing history is not imputed; several defects can affect one row.
                Counts are not reliability, repair time, equipment safety or operational
                performance metrics. No fault is sent to a PLC or industrial network.
            </p>
        </section>
    );
};

export default LifecycleFaultLab;
