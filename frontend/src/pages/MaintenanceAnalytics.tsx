import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CalendarRange, Clock3, DatabaseZap, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface MaintenanceSummary {
    periodDays: number;
    from: string;
    to: string;
    records: number;
    unresolved: number;
    legacyOrIncomplete: number;
    eligibleResolved: number;
    averageHoursToResolve: number | null;
    medianHoursToResolve: number | null;
    byType: Record<'incident' | 'maintenance', {
        records: number;
        unresolved: number;
        eligibleResolved: number;
        legacyOrIncomplete: number;
    }>;
    unresolvedAge: {
        under24Hours: number;
        from24To72Hours: number;
        over72Hours: number;
        unknownStart: number;
    };
    indicator: string;
    interpretation: string;
}

const hours = (value: number | null) => value === null ? 'Not available' : `${value.toFixed(2)} hours`;
const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const MaintenanceAnalytics = () => {
    const [days, setDays] = useState(30);
    const [summary, setSummary] = useState<MaintenanceSummary | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setSummary(null);
            setError('');
            try {
                const response = await api.get<MaintenanceSummary>('/analytics/maintenance', { params: { days } });
                if (active) setSummary(response.data);
            } catch (caught: unknown) {
                if (active) {
                    const failure = caught as { response?: { data?: { message?: string } } };
                    setError(failure.response?.data?.message || 'Analytics could not be loaded. Check the backend connection.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [days, reload]);

    const metric = (name: string, value: string | number, description: string) => (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm" key={name}>
            <p className="text-sm font-semibold text-slate-600">{name}</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="rounded-2xl bg-gradient-to-r from-[#0c3543] to-[#16796b] px-6 py-8 text-white">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-5">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-teal-200"><Activity size={16} aria-hidden="true" /> Evidence-aware operations analytics</div>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-3">Maintenance lifecycle insights</h1>
                        <p className="mt-3 text-sm text-teal-50/90 leading-relaxed">Describe reported maintenance/incident records using server-recorded transitions. This page never estimates equipment downtime or failure intervals.</p>
                    </div>
                    <label className="text-sm font-semibold">
                        Reporting cohort
                        <select value={days} onChange={(event) => setDays(Number(event.target.value))}
                            className="block mt-2 w-full sm:w-44 rounded-lg bg-white px-3 py-2.5 text-sm text-slate-900">
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                            <option value={365}>Last 365 days</option>
                        </select>
                    </label>
                </div>
            </header>

            {loading ? <div role="status" className="rounded-xl bg-white border border-slate-200 p-7 text-sm text-slate-600">Loading validated lifecycle metrics…</div> :
                error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
                    {error}
                    <button type="button" onClick={() => setReload((value) => value + 1)} className="ml-3 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={15} aria-hidden="true" />Retry</button>
                </div> : summary ? <>
                    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Maintenance log coverage">
                        {metric('Incident / maintenance records', summary.records, 'Records created during the selected cohort window')}
                        {metric('Still unresolved', summary.unresolved, 'Open, acknowledged or in-progress records')}
                        {metric('Resolved with full history', summary.eligibleResolved, 'Eligible for report-to-resolution timing')}
                        {metric('Incomplete legacy resolutions', summary.legacyOrIncomplete, 'Excluded from any timing estimate')}
                    </section>

                    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
                        <div className="flex items-start gap-3">
                            <Clock3 className="h-6 w-6 shrink-0 text-teal-700" aria-hidden="true" />
                            <div>
                                <h2 className="text-lg font-bold">Time from report to resolution</h2>
                                <p className="text-sm text-slate-600 mt-1">Only complete, server-stamped case histories. Not repair time or asset downtime.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="rounded-xl bg-teal-50 border border-teal-100 p-5">
                                <p className="text-sm font-semibold text-slate-600">Mean report-to-resolution</p>
                                <p className="text-2xl font-bold text-teal-900 mt-2 tabular-nums">{hours(summary.averageHoursToResolve)}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 border border-slate-200 p-5">
                                <p className="text-sm font-semibold text-slate-600">Median report-to-resolution</p>
                                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{hours(summary.medianHoursToResolve)}</p>
                            </div>
                        </div>
                        {summary.eligibleResolved === 0 && <p role="status" className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">Insufficient complete resolved cases for a duration estimate. No value is fabricated.</p>}
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Maintenance breakdown">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="font-bold text-slate-900">Record type breakdown</h2>
                            <p className="mt-1 text-xs text-slate-500">Counts represent incident and maintenance records created in the chosen window.</p>
                            <div className="mt-5 space-y-5">
                                {(['incident', 'maintenance'] as const).map((type) => {
                                    const counts = summary.byType[type];
                                    const share = summary.records ? 100 * counts.records / summary.records : 0;
                                    return <div key={type}>
                                        <div className="flex justify-between gap-3 text-sm">
                                            <span className="font-semibold capitalize">{type}</span>
                                            <span className="font-bold tabular-nums">{counts.records} records</span>
                                        </div>
                                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
                                            role="meter" aria-label={`${type} share of records`}
                                            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)}>
                                            <div className="h-full rounded-full bg-teal-600" style={{ width: `${share}%` }} />
                                        </div>
                                        <p className="mt-2 text-xs text-slate-600">
                                            {counts.unresolved} unresolved · {counts.eligibleResolved} timed resolutions · {counts.legacyOrIncomplete} incomplete resolutions
                                        </p>
                                    </div>;
                                })}
                            </div>
                            {summary.records === 0 && <p className="mt-4 text-sm text-slate-500">No qualifying records in this period.</p>}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="font-bold text-slate-900">Unresolved case age</h2>
                            <p className="mt-1 text-xs text-slate-500">Age since a verified server-recorded report, not repair downtime or a missed SLA.</p>
                            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                {([
                                    ['Under 24 hours', summary.unresolvedAge.under24Hours],
                                    ['24–72 hours', summary.unresolvedAge.from24To72Hours],
                                    ['72+ hours', summary.unresolvedAge.over72Hours],
                                    ['Unknown start', summary.unresolvedAge.unknownStart],
                                ] as const).map(([label, count]) => (
                                    <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                        <dt className="text-xs text-slate-600">{label}</dt>
                                        <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{count}</dd>
                                    </div>
                                ))}
                            </dl>
                            <p className="mt-4 text-xs text-slate-500">
                                Every unresolved case belongs to exactly one age bucket. Records with unverifiable report timestamps are marked unknown rather than estimated.
                            </p>
                        </div>
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="flex items-center gap-2 font-bold text-slate-900"><CalendarRange size={19} aria-hidden="true" /> Observation window</h2>
                            <p className="text-sm text-slate-600 mt-3">{dateLabel(summary.from)} – {dateLabel(summary.to)}</p>
                            <p className="text-xs text-slate-500 mt-2">The cohort includes events created during these {summary.periodDays} days. Cases resolved after the window are not timed.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                            <h2 className="flex items-center gap-2 font-bold text-slate-900"><DatabaseZap size={19} aria-hidden="true" /> Data confidence</h2>
                            <p className="text-sm text-slate-600 mt-3">{summary.eligibleResolved} eligible closed records; {summary.legacyOrIncomplete} resolved cases excluded for incomplete histories.</p>
                            <p className="text-xs text-slate-500 mt-2">Historical timestamps are not inferred from last-modified dates.</p>
                        </div>
                    </section>
                    <div className="flex gap-3 items-start rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                        <AlertTriangle size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <p><strong>Interpretation:</strong> {summary.interpretation} MTTR requires genuine repair/downtime start and end timestamps; MTBF requires equipment runtime and comparable failure episodes.</p>
                    </div>
                </> : null}
        </div>
    );
};
export default MaintenanceAnalytics;
