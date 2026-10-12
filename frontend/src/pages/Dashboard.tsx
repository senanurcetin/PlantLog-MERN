import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle, Clock, ExternalLink, Wrench } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAssetStore } from '../store/assetStore';
import { useLogStore } from '../store/logStore';

const Dashboard = () => {
    const user = useAuthStore((state) => state.user);
    const { assets, fetchAssets, isLoading: assetsLoading, error: assetsError } = useAssetStore();
    const { logs, fetchLogs, isLoading: logsLoading, error: logsError } = useLogStore();

    useEffect(() => {
        void fetchAssets();
        void fetchLogs();
    }, [fetchAssets, fetchLogs]);

    const unresolvedLogs = logs.filter((log) => log.status !== 'resolved').length;
    const maintenanceCount = assets.filter((asset) => asset.status === 'maintenance').length;
    const operationalCount = assets.filter((asset) => asset.status === 'operational').length;
    const recentLogs = [...logs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
    const loading = assetsLoading || logsLoading;
    const hasError = Boolean(assetsError || logsError);
    const stats = [
        { name: 'Total Assets', value: assetsLoading ? '—' : assets.length, icon: Activity, color: 'text-blue-700', bg: 'bg-blue-50' },
        { name: 'Unresolved Logs', value: logsLoading ? '—' : unresolvedLogs, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
        { name: 'In Maintenance', value: assetsLoading ? '—' : maintenanceCount, icon: Wrench, color: 'text-orange-700', bg: 'bg-orange-50' },
        { name: 'Operational', value: assetsLoading ? '—' : operationalCount, icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="space-y-6 plantlog-dashboard">
            <header className="plantlog-hero bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-2">Operations overview</p>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back{user?.name ? `, ${user.name}` : ''}</h1>
                    <p className="text-gray-600 mt-1">Asset status and maintenance activity from your registry.</p>
                </div>
                <div className="plantlog-registry-status sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registry health</p>
                    <div className="flex sm:justify-end items-center mt-2 gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${hasError ? 'bg-red-500' : loading ? 'bg-amber-500' : maintenanceCount || unresolvedLogs ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="font-semibold text-sm text-gray-800">
                            {hasError ? 'Data unavailable' : loading ? 'Loading live records' : maintenanceCount || unresolvedLogs ? 'Items need review' : 'No open maintenance flags'}
                        </span>
                    </div>
                </div>
            </header>

            {hasError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Unable to load all registry data. {assetsError || logsError} Please check the API connection and try again.
                </div>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label="Asset and log metrics">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.name} className="plantlog-kpi bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
                            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}><Icon className="h-6 w-6" aria-hidden="true" /></div>
                            <div>
                                <p className="text-sm text-gray-600">{stat.name}</p>
                                <p className="text-3xl font-bold tracking-tight text-gray-900 mt-1">{stat.value}</p>
                            </div>
                        </div>
                    );
                })}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <section className="plantlog-activity xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-bold text-gray-900 text-lg">Recent log activity</h2>
                            <p className="text-sm text-gray-500">Latest maintenance, incident and operations records.</p>
                        </div>
                        <Link to="/logs" className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
                            All logs <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                    {logsLoading ? (
                        <p className="p-8 text-gray-500 text-sm" role="status">Loading activity…</p>
                    ) : logsError ? (
                        <p className="p-8 text-red-700 text-sm">Log activity could not be retrieved.</p>
                    ) : recentLogs.length === 0 ? (
                        <div className="p-10 text-center">
                            <Clock className="h-9 w-9 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                            <p className="font-semibold text-gray-800">No activity recorded yet</p>
                            <p className="text-sm text-gray-500 mt-1">New log entries will appear here after they are created.</p>
                            <Link to="/logs" className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:underline">Open maintenance log</Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {recentLogs.map((log) => (
                                <li key={log._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{log.title}</p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {log.asset?.name || 'Asset unavailable'} · <span className="capitalize">{log.type}</span>
                                        </p>
                                    </div>
                                    <div className="sm:text-right shrink-0">
                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${log.status === 'resolved' ? 'bg-emerald-50 text-emerald-800' : log.status === 'acknowledged' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
                                            {log.status}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-2">{new Date(log.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="plantlog-workflow bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between">
                    <div>
                        <p className="text-xs uppercase font-semibold tracking-widest text-emerald-300">Asset workflow</p>
                        <h2 className="text-xl font-bold mt-3">Keep the equipment register current</h2>
                        <p className="text-sm text-slate-300 mt-3">Review asset status, document maintenance and keep shift handovers traceable.</p>
                        <div className="mt-6 flex items-start gap-3 text-sm text-slate-300"><Activity className="h-5 w-5 text-emerald-300 shrink-0" aria-hidden="true" />See the equipment inventory</div>
                        <div className="mt-4 flex items-start gap-3 text-sm text-slate-300"><AlertTriangle className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />Track unresolved work</div>
                    </div>
                    <Link to="/assets" className="mt-8 bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-sm font-bold text-center py-3 rounded-lg">Explore assets</Link>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
