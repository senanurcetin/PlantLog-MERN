import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, FlaskConical, ShieldAlert } from 'lucide-react';
import fixture from '../demo/fixture.json';
import { auditEvidence, evidenceCases, runEvidenceCase } from '../demo/evidence';
import type { EvidenceCase } from '../demo/evidence';

const baseline = auditEvidence(fixture);
const measures = [
    {key:'records', title:'Sample records', interpret:'Fixed cohort; no records added'},
    {key:'unlinkedRecords', title:'Unlinked records', interpret:'Records without an existing asset'},
    {key:'duplicatedRecordIds', title:'Duplicate identifiers', interpret:'Repeated log IDs after the first occurrence'},
    {key:'incompleteCaseHistories', title:'Cases missing complete audit evidence', interpret:'Incident/maintenance logs missing a complete consistent timeline'},
    {key:'evidenceQualifiedResolved', title:'Evidence-qualified resolved cases', interpret:'Resolved cases with an auditable report-to-close event pair'},
    {key:'futureDatedRecords', title:'Future-dated records', interpret:'Records created after the fictional observation endpoint'},
] as const;

const EvidenceLab = () => {
    const [selected, setSelected] = useState<EvidenceCase>('baseline');
    const changed = useMemo(() => runEvidenceCase(fixture, selected), [selected]);
    const meta = evidenceCases.find(item => item.id === selected)!;
    return (
        <div className="space-y-5" aria-label="Scientific evidence and data quality laboratory">
            <header className="nexus-card overflow-hidden">
                <div className="nexus-hero rounded-none border-0 p-6 sm:p-8">
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#8F9BFF]">
                        <FlaskConical size={18} aria-hidden="true" /> NEXUS Evidence Lab
                    </span>
                    <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Test the quality of the evidence</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200">
                        Five repeatable, controlled thought experiments with the same twelve fictional records.
                        Change exactly one attribute, compare the computed results and restore the reference
                        without creating or storing any new information.
                    </p>
                </div>
                <div className="p-5 sm:p-7">
                    <h3 className="text-base font-bold text-slate-900">Select a controlled experiment</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Every experiment uses the same baseline, fixed date and rule set.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {evidenceCases.map(item => (
                            <button key={item.id} type="button" onClick={() => setSelected(item.id)}
                                aria-pressed={selected === item.id}
                                className={`min-w-0 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600
                                  ${selected === item.id ? 'border-[#4EA8FF] bg-blue-50 ring-1 ring-[#4EA8FF]' :
                                    'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}>
                                <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                                <span className="mt-2 block text-xs leading-relaxed text-slate-600">{item.change}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <section className="nexus-card p-5 sm:p-7" aria-labelledby="evidence-comparison-title">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-800">Controlled comparison</p>
                        <h2 id="evidence-comparison-title" className="mt-2 text-xl font-bold text-slate-900">
                            {meta.label}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">{meta.change}</p>
                    </div>
                    <button type="button" onClick={() => setSelected('baseline')}
                        disabled={selected === 'baseline'}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-blue-800 hover:bg-blue-50 disabled:opacity-50">
                        Restore reference
                    </button>
                </div>
                <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <caption className="sr-only">Baseline compared with the selected fictional experiment</caption>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                            <tr>
                                <th scope="col" className="px-3 py-3">Evidence check</th>
                                <th scope="col" className="px-3 py-3 text-right">Reference</th>
                                <th scope="col" className="px-3 py-3 text-right">Experiment</th>
                                <th scope="col" className="px-3 py-3 text-right">Difference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {measures.map(({key,title}) => {
                                const before = baseline[key], after = changed[key], delta = after - before;
                                return <tr key={key}>
                                    <th scope="row" className="px-3 py-3 font-semibold text-slate-800">{title}</th>
                                    <td className="px-3 py-3 text-right tabular-nums">{before}</td>
                                    <td className="px-3 py-3 text-right font-bold tabular-nums">{after}</td>
                                    <td className={`px-3 py-3 text-right font-bold tabular-nums ${delta === 0 ? 'text-slate-500' : 'text-blue-800'}`}>
                                        {delta > 0 ? '+' : ''}{delta}
                                    </td>
                                </tr>;
                            })}
                        </tbody>
                    </table>
                </div>
                <p role="status" className="mt-4 inline-flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                    {selected === 'baseline' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> :
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                    {selected === 'baseline'
                        ? 'Reference dataset: four existing incident/maintenance cases have incomplete audit histories; one resolved case is eligible for a verified report-to-close interval.'
                        : 'Only the selected fictional attribute was changed. Observe how evidence availability or link quality changes without inventing a repair time.'}
                </p>
            </section>

            <section className="nexus-card p-5 sm:p-7" aria-labelledby="method-title">
                <h2 id="method-title" className="flex items-center gap-2 text-lg font-bold">
                    <BookOpen size={20} className="text-blue-700" aria-hidden="true" />
                    Reproducibility and calculation rules
                </h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                        ['Population', 'Twelve synthetic logs and eight fictional assets; the experiment changes one field in an in-memory copy.'],
                        ['Observation endpoint', '18 October 2026, 23:59:59.999 UTC. Events later than this are flagged rather than silently included.'],
                        ['Audit eligibility', 'An original open event matching the creation time, sequential permitted transitions, valid actors and chronological timestamps, with the final state matching the record.'],
                        ['Exclusions', 'Routine inspection/operation records do not enter incident/maintenance audit eligibility. Missing histories are never reconstructed from other fields.'],
                        ['Time interpretation', 'The evidence-qualified interval is report-to-close time. It is not machine repair time, downtime, MTTR, MTBF, predicted failure or an SLA.'],
                        ['Reproduction', 'Select any experiment and Restore reference; source fixtures, accounts, browsers and backend remain unchanged.'],
                    ].map(([term,description])=>(
                        <div key={term} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <dt className="text-sm font-bold text-slate-900">{term}</dt>
                            <dd className="mt-1 text-sm leading-relaxed text-slate-600">{description}</dd>
                        </div>
                    ))}
                </dl>
                <a href="https://github.com/senanurcetin/PlantLog-MERN/blob/main/docs/evidence-methodology.md"
                   target="_blank" rel="noopener noreferrer"
                   className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-800 hover:underline">
                    Inspect full methods and test cases <ArrowRight size={17} aria-hidden="true" />
                </a>
            </section>
        </div>
    );
};
export default EvidenceLab;
