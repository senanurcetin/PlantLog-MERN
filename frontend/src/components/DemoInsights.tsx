import { Activity, AlertCircle, BarChart3, ClipboardList, Layers, Wrench } from 'lucide-react';
import { buildDemoInsights } from '../demo/insights';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';
import { assessDemoDataQuality } from '../demo/quality';
import { assessLifecycleTraceability } from '../demo/traceability';
import ControlledComparisons from './ControlledComparisons';
import EligibilitySensitivityLab from './EligibilitySensitivityLab';
import LifecycleFaultLab from './LifecycleFaultLab';
import TemporalBoundaryLab from './TemporalBoundaryLab';
import EvidenceMatrixLab from './EvidenceMatrixLab';
import EvidenceReviewWorkbench from './EvidenceReviewWorkbench';

const typeDetails = [
    {key: 'incident', label: 'Incidents', color: 'bg-rose-500', text: 'text-rose-700'},
    {key: 'maintenance', label: 'Maintenance', color: 'bg-[#6E55C6]', text: 'text-violet-700'},
    {key: 'inspection', label: 'Inspections', color: 'bg-[#4EA8FF]', text: 'text-blue-700'},
    {key: 'operation', label: 'Operations', color: 'bg-slate-500', text: 'text-slate-700'},
] as const;
const DemoInsights = ({ assets, logs, snapshot, onOpenHistory }: {
    assets: DemoInsightAsset[];
    logs: DemoInsightLog[];
    snapshot: string;
    onOpenHistory: (assetId: string) => void;
}) => {
    const summary = buildDemoInsights(assets, logs, snapshot);
    const quality = assessDemoDataQuality(assets, logs, snapshot);
    const traceability = assessLifecycleTraceability(logs, snapshot);
    const highest = Math.max(1, ...summary.dailyIntake.map(day => day.total));
    return (
        <div className="space-y-5" aria-label="Synthetic maintenance analytics">
            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-800" aria-hidden="true" />
                <div>
                    <h2 className="font-bold">An illustrative workload snapshot, not a reliability report</h2>
                    <p className="mt-1 text-blue-900/85">
                        Calculated exclusively from {summary.totalRecords} fictional entries as of {summary.snapshot}.
                        Any additional scenario entry is temporary and disappears on reset or reload.
                        Recorded case counts cannot establish equipment downtime, failure rate,
                        probability of failure, MTTR or MTBF.
                    </p>
                </div>
            </div>

            <section className="nexus-card p-5 sm:p-6" aria-labelledby="data-quality-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 id="data-quality-heading" className="text-lg font-bold text-slate-900">
                            Synthetic data quality and provenance
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Transparent checks on the same fixed example records; not a plant certification.
                        </p>
                    </div>
                    <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-900">
                        {quality.eligibleRecords} / {quality.assessedRecords} eligible rows
                    </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {quality.findings.map(finding => (
                        <div key={finding.code} className={`rounded-xl border p-3 ${
                            finding.count === 0 ? 'border-slate-200 bg-slate-50' :
                                finding.severity === 'error' ? 'border-rose-200 bg-rose-50' :
                                    'border-amber-200 bg-amber-50'
                        }`}>
                            <dt className="text-xs font-medium text-slate-700">{finding.meaning}</dt>
                            <dd className={`mt-2 text-xl font-bold tabular-nums ${
                                finding.count === 0 ? 'text-slate-900' :
                                    finding.severity === 'error' ? 'text-rose-800' : 'text-amber-800'
                            }`}>
                                {finding.count}
                            </dd>
                            <dd className="mt-1 text-[11px] font-semibold text-slate-700">
                                {finding.count === 0 ? 'Check passed' :
                                    finding.severity === 'error' ? 'Integrity issue' : 'Review required'}
                            </dd>
                        </div>
                    ))}
                </dl>
                {quality.eligibleRecords < quality.assessedRecords && (
                    <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                        This fixture has {quality.assessedRecords - quality.eligibleRecords} record(s)
                        excluded by the scientific eligibility rules. The activity charts
                        still show raw fictional records and must not be interpreted as
                        quality-filtered estimates.
                    </p>
                )}
                <p className="mt-3 text-xs text-slate-500">
                    Checked {quality.assessedAssets} assets and {quality.assessedRecords} records.
                    Overlapping findings must not be added together to infer a count of unique bad rows.
                    {quality.caveat}
                </p>
            </section>

            <section className="nexus-card p-5 sm:p-6" aria-labelledby="lifecycle-trace-heading">
                <h2 id="lifecycle-trace-heading" className="text-lg font-bold text-slate-900">
                    Lifecycle timeline traceability
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                    A separate verification of the fictional status-event chains. This does not
                    change the record-quality denominator or any workload chart.
                </p>
                <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {([
                        { label: 'Internally consistent history', count: traceability.verifiedHistory },
                        { label: 'History not recorded', count: traceability.missingHistory },
                        { label: 'Contradictory or invalid history', count: traceability.invalidHistory },
                    ] as const).map(item => (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <dt className="text-xs font-medium text-slate-700">{item.label}</dt>
                            <dd className="mt-2 text-2xl font-extrabold tabular-nums text-slate-900">{item.count}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-3 text-xs text-slate-600">
                    {traceability.assessedRecords} total fictional entries;
                    {' '}{traceability.observedHistoryEvents} recorded status events.
                    Missing history is unknown, not a passed or failed timeline.
                    Issue counts may overlap across the same record.
                </p>
                {traceability.invalidHistory > 0 && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="status">
                        <p className="font-semibold">Review synthetic timeline contradictions</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            {traceability.issues.filter(issue => issue.count > 0 &&
                                issue.code !== 'MISSING_HISTORY').map(issue => (
                                <li key={issue.code}>{issue.code.replace(/_/g, ' ').toLowerCase()}: {issue.count} record(s)</li>
                            ))}
                        </ul>
                    </div>
                )}
                <p className="mt-3 text-xs text-slate-500">{traceability.caveat}</p>
            </section>

            <section aria-labelledby="insights-summary-title">
                <h2 id="insights-summary-title" className="mb-4 text-lg font-bold">Recorded activity at a glance</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {([
                        {title:'Total log entries',value:summary.totalRecords,icon:ClipboardList,desc:'All record types in the sample'},
                        {title:'Open maintenance cases',value:summary.openMaintenanceCases,icon:Wrench,desc:'Unresolved incident / maintenance entries'},
                        {title:'Equipment with open cases',value:summary.affectedEquipment,icon:Layers,desc:'Distinct linked equipment records'},
                        {title:'Other unresolved entries',value:summary.otherOpenEntries,icon:Activity,desc:'Open inspection / operation records'},
                    ] as const).map(card => {
                        const Icon = card.icon;
                        return <article key={card.title} className="nexus-card p-5">
                            <span className="inline-flex rounded-xl bg-blue-50 p-2.5 text-blue-700">
                                <Icon size={22} aria-hidden="true" />
                            </span>
                            <h3 className="mt-3 text-sm font-semibold text-slate-700">{card.title}</h3>
                            <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{card.value}</p>
                            <p className="mt-2 text-xs text-slate-500">{card.desc}</p>
                        </article>;
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <section className="nexus-card p-5 sm:p-6" aria-labelledby="insights-record-types">
                    <h2 id="insights-record-types" className="text-lg font-bold">Recorded work by type</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Counts include resolved and unresolved entries. Each log is counted once.
                    </p>
                    <div className="mt-6 space-y-5">
                        {typeDetails.map(({key,label,color,text}) => {
                            const count = summary.byType[key];
                            const pct = summary.totalRecords ? count / summary.totalRecords * 100 : 0;
                            return <div key={key}>
                                <div className="mb-2 flex justify-between text-sm">
                                    <span className={`font-semibold ${text}`}>{label}</span>
                                    <span className="tabular-nums text-slate-700">{count} / {summary.totalRecords}</span>
                                </div>
                                <div className="h-3 overflow-hidden rounded-full bg-slate-100"
                                    role="img" aria-label={`${label}: ${count} of ${summary.totalRecords} records`}>
                                    <div className={`h-full rounded-full ${color}`}
                                        style={{width: `${pct}%`}} />
                                </div>
                            </div>;
                        })}
                    </div>
                    <p className="mt-6 text-xs text-slate-500">
                        Source: the synthetic PlantLog logbook, plus any temporary scenario entry.
                    </p>
                </section>

                <section className="nexus-card p-5 sm:p-6" aria-labelledby="insights-equipment">
                    <h2 id="insights-equipment" className="text-lg font-bold">Equipment with unresolved cases</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Open incident and maintenance entries only. Sorted by recorded workload, not risk.
                    </p>
                    <ol className="mt-5 divide-y divide-slate-100">
                        {summary.equipment.map(row => (
                            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-slate-900">{row.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {row.serialNumber} · {row.incidents} {row.incidents === 1 ? 'incident' : 'incidents'} · {row.maintenance} maintenance
                                        {row.status === 'decommissioned' ? ' · Decommissioned' : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-3">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800">
                                        {row.openCases} open
                                    </span>
                                    <button type="button" onClick={() => onOpenHistory(row.id)}
                                        className="text-sm font-bold text-blue-800 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                                        aria-label={`View history for ${row.name}`}>View history →</button>
                                </div>
                            </li>
                        ))}
                    </ol>
                    {summary.equipment.length === 0 && <p className="mt-5 text-sm text-slate-600">
                        No unresolved incident or maintenance cases in this snapshot.
                    </p>}
                    <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {summary.unlinkedOpenCases} unresolved maintenance cases without a matching equipment record.
                        History links include both resolved and unresolved logs.
                    </p>
                </section>
            </div>

            <section className="nexus-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6" aria-labelledby="insights-timeline">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 id="insights-timeline" className="flex items-center gap-2 text-lg font-bold">
                            <BarChart3 size={22} className="text-blue-700" aria-hidden="true" />
                            Recorded intake by UTC date
                        </h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {summary.windowDays}-day window ending {summary.snapshot}. Counts reflect new log records,
                            not equipment runtime or an incident rate.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 sm:hidden">
                            Swipe the chart horizontally to inspect every date.
                        </p>
                    </div>
                    <div aria-label="Activity type legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        {typeDetails.map(item => <span key={item.key} className="flex items-center gap-1.5">
                            <span className={`h-3 w-3 rounded-sm ${item.color}`} aria-hidden="true" />
                            {item.label}
                        </span>)}
                    </div>
                </div>
                <div className="mt-5 w-full min-w-0 max-w-full overflow-x-auto pb-2"
                    tabIndex={0} role="region" aria-label="Eight-day recorded intake chart, scroll horizontally for later dates">
                    <ol className="grid min-w-[600px] grid-cols-8 gap-3">
                        {summary.dailyIntake.map(day => (
                            <li key={day.day} className="relative rounded-lg bg-slate-50 p-3 text-center"
                                aria-label={`${day.day}: ${day.total} ${day.total === 1 ? 'record' : 'records'}; ${typeDetails.map(item =>
                                    `${day[item.key]} ${item.label.toLowerCase()}`).join(', ')}`}>
                                <span className="text-xs font-bold tabular-nums text-slate-800">{day.total} {day.total === 1 ? 'log' : 'logs'}</span>
                                <div className="mt-3 flex h-28 flex-col justify-end" aria-hidden="true">
                                    <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                                        style={{height: `${day.total / highest * 100}%`}}>
                                        {typeDetails.map(item => (
                                            <div key={item.key} className={item.color}
                                                style={{flex: day[item.key]}} />
                                        ))}
                                    </div>
                                </div>
                                <time dateTime={day.day} className="mt-3 block text-xs font-semibold tabular-nums text-slate-700">
                                    {day.day.slice(5)}
                                </time>
                            </li>
                        ))}
                    </ol>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                    {summary.dailyIntake.reduce((n,day)=>n+day.total,0)} records inside the shown period;
                    {' '}{summary.outsideWindow} recorded outside it. No estimated events are added.
                </p>
            </section>
            <ControlledComparisons assets={assets} logs={logs} snapshot={snapshot} />
            <EligibilitySensitivityLab assets={assets} logs={logs} snapshot={snapshot} />
            <LifecycleFaultLab assets={assets} logs={logs} snapshot={snapshot} />
            <TemporalBoundaryLab assets={assets} />
            <EvidenceMatrixLab assets={assets} logs={logs} snapshot={snapshot} />
            <EvidenceReviewWorkbench assets={assets} logs={logs} snapshot={snapshot} />
        </div>
    );
};

export default DemoInsights;
