import { useMemo, useState } from 'react';
import { buildTemporalBoundaryExperiments } from '../demo/temporal-boundaries';
import type { DemoInsightAsset } from '../demo/insights';

const TemporalBoundaryLab = ({ assets }: { assets: DemoInsightAsset[] }) => {
    const cases = useMemo(() => buildTemporalBoundaryExperiments(assets), [assets]);
    const [selected, setSelected] = useState('ordinary');
    const current = cases.find(item => item.id === selected) || cases[0];
    const diagnostics = current.observed.issueCodes;

    return (
        <section className="nexus-card min-w-0 max-w-full p-5 sm:p-6"
            aria-labelledby="temporal-boundary-heading">
            <h2 id="temporal-boundary-heading" className="text-lg font-bold text-slate-900">
                UTC boundary &amp; chronology laboratory
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Twelve fixed, fictional timestamp cases test the difference between
                basic record eligibility and the integrity of event chronology.
                Each example is constructed in memory and assessed against a stated
                observation date; no real equipment data or API requests are involved.
            </p>
            <div className="mt-4 max-w-lg">
                <label htmlFor="temporal-boundary-case"
                    className="block text-sm font-semibold text-slate-800">
                    Synthetic UTC edge case
                </label>
                <select id="temporal-boundary-case" value={current.id}
                    onChange={event => setSelected(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                    {cases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
                </select>
            </div>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4"
                aria-live="polite" aria-atomic="true">
                <h3 className="font-bold text-slate-900">{current.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{current.assumption}</p>
                <p className="mt-2 text-xs font-semibold text-blue-950">
                    Fixed observation date (UTC): {current.observationDateUTC}
                </p>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">Basic record eligibility</dt>
                        <dd className="mt-1 font-bold text-slate-900">
                            {current.observed.eligible ? 'Eligible' : 'Excluded'}
                        </dd>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">History classification</dt>
                        <dd className="mt-1 font-bold capitalize text-slate-900">
                            {current.observed.classification}
                        </dd>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                        <dt className="text-xs text-slate-600">Contract assessment</dt>
                        <dd className="mt-1 font-bold text-slate-900">
                            {current.matchesExpected ? 'Expected behavior' : 'Unexpected behavior'}
                        </dd>
                    </div>
                </dl>
                {!current.matchesExpected && (
                    <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">
                        Observed and expected classifications differ. This is an
                        unresolved synthetic consistency finding, not a verified result.
                    </p>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm font-semibold text-slate-800">
                    {diagnostics.length ? 'Detected timeline diagnostics' : 'No timeline diagnostic detected'}
                </p>
                {diagnostics.length > 0 && (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2"
                        aria-label="Detected synthetic chronology issues">
                        {diagnostics.map(code => <li key={code}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-900">
                            {code}
                        </li>)}
                    </ul>
                )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-600">
                The checker applies a strict Z-only timestamp convention and inclusive
                23:59:59.999 UTC observation endpoint. This lab validates deterministic
                software rules, not the authenticity of an event, operating hours,
                downtime, repair duration, MTTR, MTBF or safety certification.
            </p>
        </section>
    );
};

export default TemporalBoundaryLab;
