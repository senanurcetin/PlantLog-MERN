import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLogStore } from '../store/logStore';
import { useAssetStore } from '../store/assetStore';
import { Plus, Search, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { filterLogs, logsToCsv } from '../utils/registryFilters';

const Logs = () => {
    const { logs, isLoading, error, fetchLogs, addLog, updateLogStatus } = useLogStore();
    const { assets, fetchAssets } = useAssetStore();
    const { user } = useAuthStore();
    const [params] = useSearchParams();
    const activeAssetId = params.get('assetId') || undefined;
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [submitError, setSubmitError] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const filteredLogs = useMemo(() => filterLogs(logs, query, typeFilter, statusFilter), [logs, query, typeFilter, statusFilter]);
    const availableAssets = useMemo(
        () => assets.filter((asset) => asset.status !== 'decommissioned'), [assets],
    );

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        assetId: '',
        type: 'operation',
        title: '',
        description: '',
        status: 'open'
    });

    useEffect(() => {
        void fetchLogs(activeAssetId);
        void fetchAssets();
    }, [fetchLogs, fetchAssets, activeAssetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        try {
            await addLog(formData);
            await fetchLogs(activeAssetId);
            setShowModal(false);
            setFormData({ assetId: '', type: 'operation', title: '', description: '', status: 'open' });
        } catch {
            setSubmitError(useLogStore.getState().error || 'Unable to save log entry');
        }
    };

    const transition = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await updateLogStatus(id, status);
        } catch {
            // Store error banner displays the failure; preserve current record.
        } finally {
            setUpdatingId(null);
        }
    };

    const downloadFilteredLogs = () => {
        if (filteredLogs.length === 0) return;
        const csv = logsToCsv(filteredLogs);
        const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `plantlog-maintenance-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Resolved</span>;
            case 'in_progress': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">In progress</span>;
            case 'acknowledged': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Acknowledged</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Open</span>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'incident': return <span className="text-red-600 font-medium capitalize">{type}</span>;
            case 'maintenance': return <span className="text-orange-600 font-medium capitalize">{type}</span>;
            case 'inspection': return <span className="text-blue-600 font-medium capitalize">{type}</span>;
            default: return <span className="text-gray-600 font-medium capitalize">{type}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="relative">
                        <span className="sr-only">Search logs</span>
                        <Search className="absolute inset-y-0 left-3 my-auto h-5 w-5 text-gray-400" aria-hidden="true" />
                        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search logs, equipment or author..."
                            className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm" />
                    </label>
                    <label><span className="sr-only">Filter logs by type</span>
                        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                            <option value="all">All types</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="incident">Incident</option>
                            <option value="inspection">Inspection</option>
                            <option value="operation">Operation</option>
                        </select>
                    </label>
                    <label><span className="sr-only">Filter logs by status</span>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                            <option value="all">All statuses</option>
                            <option value="open">Open</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </label>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={downloadFilteredLogs} disabled={filteredLogs.length === 0}
                        className="inline-flex items-center justify-center rounded-lg border border-teal-700 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50">
                        Export filtered CSV
                    </button>
                    <button type="button" onClick={() => { setSubmitError(''); setFormData((old) => ({ ...old, assetId: availableAssets.some(a => a._id === activeAssetId) ? activeAssetId! : '' })); setShowModal(true); }}
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> New Log Entry
                    </button>
                </div>
            </div>
            {activeAssetId && <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                Showing the maintenance history for {assets.find((asset) => asset._id === activeAssetId)?.name || 'selected equipment'}.
                <Link to="/logs" className="ml-2 font-semibold underline">Show all logs</Link>
            </div>}
            {error && !showModal && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error} <button type="button" onClick={() => void fetchLogs(activeAssetId)} className="ml-2 font-semibold underline">Retry</button>
            </div>}
            {/* Logs List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <FileText className="h-12 w-12 text-gray-300 mb-3" />
                        <p>No log entries match the current filters.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {filteredLogs.map((log) => (
                            <li key={log._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(log.status)}
                                        <span className="text-sm text-gray-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {log.status !== 'resolved' && (user?.role === 'admin' || user?.role === 'supervisor' || user?._id === log.author?._id) && (
                                            <div className="flex flex-wrap gap-2">
                                                {log.status === 'open' && <button type="button" disabled={updatingId === log._id}
                                                    onClick={() => void transition(log._id, 'acknowledged')}
                                                    className="text-xs font-semibold text-teal-700 hover:underline disabled:opacity-50">Acknowledge</button>}
                                                {log.status === 'acknowledged' && <button type="button" disabled={updatingId === log._id}
                                                    onClick={() => void transition(log._id, 'in_progress')}
                                                    className="text-xs font-semibold text-blue-700 hover:underline disabled:opacity-50">Start work</button>}
                                                <button type="button" disabled={updatingId === log._id}
                                                    onClick={() => void transition(log._id, 'resolved')}
                                                    className="text-xs font-semibold text-primary-600 hover:underline disabled:opacity-50">Mark resolved</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h4 className="text-lg font-bold text-gray-900 mb-1">{log.title}</h4>
                                <div className="text-sm mb-3">
                                    <span className="text-gray-500">Type: </span> {getTypeBadge(log.type)}
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span className="text-gray-500">Asset: </span> <span className="font-medium text-gray-900">{log.asset?.name || 'Unknown'}</span> ({log.asset?.serialNumber})
                                </div>

                                <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded border border-gray-100 mb-3">
                                    {log.description}
                                </p>

                                <div className="text-xs text-gray-500 flex items-center">
                                    <span>Logged by: <span className="font-medium text-gray-700">{log.author?.name || 'Unknown'}</span> ({log.author?.role})</span>
                                </div>
                                <details className="mt-3 rounded-lg border border-gray-100 bg-slate-50 p-3 text-xs text-gray-700">
                                    <summary className="cursor-pointer font-semibold text-teal-800">Status history ({log.statusHistory?.length || 0} recorded events)</summary>
                                    {log.statusHistory?.length ? <ol className="mt-3 space-y-2">
                                        {log.statusHistory.map((event, index) => (
                                            <li key={index} className="border-l-2 border-teal-200 pl-3">
                                                <span className="capitalize font-semibold">{event.from || 'Created'} → {event.to.replace('_', ' ')}</span>
                                                <span className="ml-2 text-gray-500">{new Date(event.changedAt).toLocaleString()}</span>
                                                {typeof event.changedBy === 'object' && event.changedBy?.name && <span className="ml-2 text-gray-500">by {event.changedBy.name}</span>}
                                            </li>
                                        ))}
                                    </ol> : <p className="mt-2 text-amber-800">Legacy record; event timestamps were not reconstructed.</p>}
                                </details>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-xs text-gray-500" aria-live="polite">Showing {filteredLogs.length} of {logs.length} loaded log entries.</p>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Log Entry</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {submitError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</p>}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Asset</label>
                                <select required value={formData.assetId} onChange={e => setFormData({ ...formData, assetId: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2">
                                    <option value="" disabled>Select an Asset</option>
                                    {availableAssets.map(a => (
                                        <option key={a._id} value={a._id}>{a.name} ({a.serialNumber})</option>
                                    ))}
                                </select>
                            </div>
                            {availableAssets.length === 0 &&
                                <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                                    No active equipment is available for new entries. Existing maintenance history remains accessible.
                                </p>}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Log Type</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2">
                                    <option value="operation">Operation</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="incident">Incident</option>
                                    <option value="inspection">Inspection</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2" />
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={!formData.assetId || isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Saving…' : 'Save Log Entry'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
