import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Activity, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList,
    Factory, Gauge, HardHat, Search, ShieldCheck, Wrench, X,
} from 'lucide-react';
import fixture from '../demo/fixture.json';
import NexusBrand from '../components/NexusBrand';

type View = 'overview' | 'assets' | 'logs';
type Asset = (typeof fixture.assets)[number];
type Log = (typeof fixture.logs)[number];

const statusStyles: Record<string, string> = {
    operational: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    maintenance: 'bg-amber-50 text-amber-800 ring-amber-200',
    decommissioned: 'bg-slate-100 text-slate-700 ring-slate-200',
    open: 'bg-rose-50 text-rose-700 ring-rose-200',
    acknowledged: 'bg-amber-50 text-amber-800 ring-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};
const displayDate = (value: string) =>
    new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(value));

function StatusPill({ status }: { status: string }) {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset capitalize ${statusStyles[status] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>{status}</span>;
}

const Demo = () => {
    const [view, setView] = useState<View>('overview');
    const [search, setSearch] = useState('');
    const [assetStatus, setAssetStatus] = useState('all');
    const [logType, setLogType] = useState('all');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const { assets, logs, context } = fixture;
    const publicDemoOnly = import.meta.env.VITE_PUBLIC_DEMO_ONLY === 'true';
    const operational = assets.filter(asset => asset.status === 'operational').length;
    const maintenance = assets.filter(asset => asset.status === 'maintenance').length;
    const unresolved = logs.filter(log => log.status !== 'resolved').length;
    const assetById = useMemo(() => new Map(assets.map(asset => [asset.id, asset])), [assets]);

    const searchedAssets = useMemo(() =>
        assets.filter(asset => {
            const matchesText = [asset.name, asset.serialNumber, asset.category, asset.location]
                .some(value => value.toLowerCase().includes(search.toLowerCase().trim()));
            return matchesText && (assetStatus === 'all' || asset.status === assetStatus);
        }), [assets, search, assetStatus]);

    const searchedLogs = useMemo(() =>
        logs.filter(log => {
            const asset = assetById.get(log.assetId);
            const matchesText = [log.title, log.description, log.type, log.status, asset?.name || '']
                .some(value => value.toLowerCase().includes(search.toLowerCase().trim()));
            return matchesText && (logType === 'all' || log.type === logType)
                && (!selectedAssetId || log.assetId === selectedAssetId);
        }).sort((a, b) => b.date.localeCompare(a.date)),
    [logs, assetById, search, logType, selectedAssetId]);

    const selectedAsset: Asset | undefined = selectedAssetId
        ? assetById.get(selectedAssetId) : undefined;

    const navigate = (next: View) => {
        setView(next);
        setSearch('');
        setAssetStatus('all');
        setLogType('all');
        setSelectedAssetId(null);
    };

    const metricCards = [
        { label: 'Registered assets', count: assets.length, subtitle: 'Synthetic equipment inventory', icon: Factory, iconStyle: 'bg-cyan-100 text-blue-800' },
        { label: 'Operational', count: operational, subtitle: 'From sample status records', icon: CheckCircle2, iconStyle: 'bg-emerald-100 text-emerald-800' },
        { label: 'Maintenance', count: maintenance, subtitle: 'Assets requiring service', icon: Wrench, iconStyle: 'bg-amber-100 text-amber-800' },
        { label: 'Unresolved entries', count: unresolved, subtitle: 'Open or acknowledged logs', icon: Activity, iconStyle: 'bg-rose-100 text-rose-800' },
    ];

    const renderLog = (log: Log) => (
        <li key={log.id} className="px-5 py-5 sm:px-6 hover:bg-slate-50/80 transition-colors">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <StatusPill status={log.status} />
                <span className="uppercase tracking-wider font-semibold text-slate-500">{log.type}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={log.date}>{displayDate(log.date)}</time>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mt-3">
                <div>
                    <h3 className="font-semibold text-slate-900">{log.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-blue-700">{assetById.get(log.assetId)?.name || 'Unknown asset'}</p>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{log.description}</p>
                </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Logged by {log.reportedBy} · {log.id}</p>
            {log.statusHistory.length > 0 && <details className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-700">
                <summary className="cursor-pointer font-semibold text-blue-800">Example status timeline ({log.statusHistory.length} events)</summary>
                <ol className="mt-3 space-y-2">
                    {log.statusHistory.map((event, index) => <li key={index} className="border-l-2 border-blue-200 pl-3">
                        <span className="font-semibold capitalize">{event.from ? event.from.replace('_', ' ') : 'Created'} → {event.to.replace('_', ' ')}</span>
                        <span className="ml-2 text-slate-500">{displayDate(event.changedAt)} · {event.changedBy}</span>
                    </li>)}
                </ol>
            </details>}

        </li>
    );

    return (
        <div className="nexus-demo min-h-screen text-slate-900">
            <div className="bg-[#0B0F19] text-slate-100 border-b border-[#6E55C6]/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck size={14} aria-hidden="true" /> READ-ONLY PUBLIC DEMONSTRATION</span>
                    <span className="text-blue-100">Synthetic records · No login · No API writes · No plant connectivity</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="flex flex-wrap items-center justify-between gap-4 py-6">
                    <div className="nexus-auth-heading inline-flex items-center rounded-2xl px-4 py-2.5">
                        <NexusBrand />
                        <span className="ml-3 hidden rounded-md border border-[#8F9BFF]/40 px-2 py-1 text-xs font-bold tracking-wide text-[#8F9BFF] sm:inline">DEMO</span>
                    </div>
                    {publicDemoOnly
                        ? <a href="https://github.com/senanurcetin/PlantLog-MERN" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-800">
                            View source on GitHub <ArrowRight size={16} aria-hidden="true" />
                        </a>
                        : <Link to="/login" className="inline-flex gap-2 items-center text-sm font-semibold text-slate-700 hover:text-blue-800 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><ArrowLeft size={16} aria-hidden="true" /> Sign in to full application</Link>}
                </header>

                <nav className="flex flex-wrap gap-2 pb-5" aria-label="Demonstration sections">
                    {([
                        ['overview', 'Overview', Gauge],
                        ['assets', 'Asset registry', Factory],
                        ['logs', 'Maintenance log', ClipboardList],
                    ] as const).map(([id, label, Icon]) => (
                        <button type="button" key={id} onClick={() => navigate(id)}
                            aria-current={view === id ? 'page' : undefined}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${view === id ? 'bg-[#0B0F19] text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                            <Icon size={17} aria-hidden="true" />{label}
                        </button>
                    ))}
                </nav>

                <main className="space-y-6 pb-16">
                    <section className="rounded-2xl nexus-hero text-white p-6 sm:p-9 shadow-xl relative overflow-hidden">
                        <div className="relative z-10 max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-200">Operations intelligence / sample facility</p>
                            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight">{view === 'overview' ? 'Know what needs attention.' : view === 'assets' ? 'Equipment register.' : 'Shift and maintenance records.'}</h1>
                            <p className="text-sm sm:text-base text-blue-50/90 mt-3 leading-relaxed">{context.facility} · Snapshot {displayDate(context.snapshot)}. Explore a realistic workflow with completely fictional data.</p>
                            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold"><HardHat size={16} aria-hidden="true" /> Portfolio demonstration — not live operational monitoring</div>
                        </div>
                    </section>

                    <section aria-label="Sample registry metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {metricCards.map(item => {
                            const Icon = item.icon;
                            return <article key={item.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                <div className={`inline-flex rounded-xl p-2.5 ${item.iconStyle}`}><Icon size={22} aria-hidden="true" /></div>
                                <p className="text-sm font-medium text-slate-600 mt-4">{item.label}</p>
                                <p className="text-3xl font-extrabold tracking-tight mt-1 tabular-nums">{item.count}</p>
                                <p className="text-xs text-slate-500 mt-2">{item.subtitle}</p>
                            </article>;
                        })}
                    </section>

                    {view === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            <section className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h2 className="text-lg font-bold">Equipment status</h2>
                                <p className="text-sm text-slate-500 mt-1">Distribution across {assets.length} example assets.</p>
                                <div className="mt-7 space-y-5">
                                    {(['operational', 'maintenance', 'decommissioned'] as const).map(status => {
                                        const count = assets.filter(asset => asset.status === status).length;
                                        return <div key={status}>
                                            <div className="flex justify-between text-sm font-semibold mb-2"><span className="capitalize">{status}</span><span className="tabular-nums">{count} / {assets.length}</span></div>
                                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${status === 'operational' ? 'bg-emerald-500' : status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-500'}`} style={{ width: `${Math.round(100 * count / assets.length)}%` }} />
                                            </div>
                                        </div>;
                                    })}
                                </div>
                                <button type="button" onClick={() => navigate('assets')} className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-blue-800 hover:underline">Inspect all assets <ArrowRight size={16} aria-hidden="true" /></button>
                            </section>
                            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
                                    <div><h2 className="text-lg font-bold">Recent maintenance activity</h2><p className="text-sm text-slate-500">Latest entries from the sample logbook.</p></div>
                                    <button type="button" onClick={() => navigate('logs')} className="inline-flex items-center gap-1 text-sm font-bold text-blue-800 hover:underline">View all <ArrowRight size={16} aria-hidden="true" /></button>
                                </div>
                                <ul className="divide-y divide-slate-100">{logs.slice(0, 4).map(renderLog)}</ul>
                            </section>
                        </div>
                    )}

                    {view === 'assets' && (
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" aria-label="Synthetic asset registry">
                            <div className="px-5 sm:px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div><h2 className="text-lg font-bold">Asset registry</h2><p className="text-sm text-slate-500">Select an asset to examine its maintenance history.</p></div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <label className="relative">
                                        <span className="sr-only">Search sample assets</span>
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={17} aria-hidden="true" />
                                        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find equipment or location" className="w-full sm:w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                                    </label>
                                    <label>
                                        <span className="sr-only">Filter assets by status</span>
                                        <select value={assetStatus} onChange={event => setAssetStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                                            <option value="all">All statuses</option><option value="operational">Operational</option><option value="maintenance">Maintenance</option><option value="decommissioned">Decommissioned</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th scope="col" className="px-5 sm:px-6 py-4">Asset</th><th scope="col" className="px-5 py-4">Status</th><th scope="col" className="px-5 py-4">Location</th><th scope="col" className="px-5 py-4">Criticality</th><th scope="col" className="px-5 py-4">History</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {searchedAssets.map(asset => <tr key={asset.id} className="hover:bg-slate-50">
                                            <td className="px-5 sm:px-6 py-4"><p className="font-semibold text-slate-900">{asset.name}</p><p className="text-xs text-slate-500 font-mono mt-1">{asset.serialNumber}</p></td>
                                            <td className="px-5 py-4"><StatusPill status={asset.status} /></td><td className="px-5 py-4 text-slate-600">{asset.location}</td>
                                            <td className="px-5 py-4 capitalize text-slate-600">{asset.criticality}</td>
                                            <td className="px-5 py-4"><button type="button" onClick={() => { setSelectedAssetId(asset.id); setSearch(''); setLogType('all'); setView('logs'); }} className="text-blue-800 font-bold hover:underline whitespace-nowrap">View logs →</button></td>
                                        </tr>)}
                                    </tbody>
                                </table>
                                {searchedAssets.length === 0 && <p className="p-10 text-center text-slate-500">No assets match the current filters.</p>}
                            </div>
                            <p className="px-6 py-4 text-xs text-slate-500 border-t border-slate-100">{searchedAssets.length} of {assets.length} fictional assets shown. Changes cannot be saved.</p>
                        </section>
                    )}

                    {view === 'logs' && (
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" aria-label="Synthetic maintenance log">
                            <div className="px-5 sm:px-6 py-5 border-b border-slate-100">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                    <div><h2 className="text-lg font-bold">Maintenance & shift log</h2><p className="text-sm text-slate-500">Inspection, incident and service events in the sample dataset.</p></div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <label className="relative">
                                            <span className="sr-only">Search sample log entries</span><Search className="absolute left-3 top-2.5 text-slate-400" size={17} aria-hidden="true" />
                                            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records" className="w-full sm:w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                                        </label>
                                        <label><span className="sr-only">Filter log type</span><select value={logType} onChange={event => setLogType(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                                            <option value="all">All types</option><option value="maintenance">Maintenance</option><option value="incident">Incidents</option><option value="inspection">Inspections</option><option value="operation">Operations</option>
                                        </select></label>
                                    </div>
                                </div>
                                {selectedAsset && <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Asset: {selectedAsset.name}<button type="button" onClick={() => setSelectedAssetId(null)} aria-label="Clear asset filter" className="hover:text-blue-950 rounded"><X size={16} /></button></div>}
                            </div>
                            <ul className="divide-y divide-slate-100">{searchedLogs.map(renderLog)}</ul>
                            {searchedLogs.length === 0 && <p className="p-10 text-center text-slate-500">No log entries match the current filters.</p>}
                            <p className="px-6 py-4 text-xs text-slate-500 border-t border-slate-100">Showing {searchedLogs.length} of {logs.length} fictional log entries.</p>
                        </section>
                    )}
                    <footer className="rounded-2xl border border-blue-100 bg-blue-50/70 px-5 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div><p className="font-semibold text-slate-800">About this demo</p><p className="text-sm text-slate-600 mt-1">{context.notice} All indicators are calculated from this fixed example dataset.</p></div>
                        {publicDemoOnly
                            ? <a href="https://github.com/senanurcetin/PlantLog-MERN" target="_blank" rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-blue-800 hover:underline">
                                Inspect project code <ArrowRight size={16} aria-hidden="true" />
                            </a>
                            : <Link to="/login" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-blue-800 hover:underline">Go to sign in <ArrowRight size={16} aria-hidden="true" /></Link>}
                    </footer>
                </main>
            </div>
        </div>
    );
};
export default Demo;
