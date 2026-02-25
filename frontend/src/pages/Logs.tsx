import { useEffect, useState } from 'react';
import { useLogStore } from '../store/logStore';
import { useAssetStore } from '../store/assetStore';
import { Plus, Search, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const Logs = () => {
    const { logs, isLoading, fetchLogs, addLog, updateLogStatus } = useLogStore();
    const { assets, fetchAssets } = useAssetStore();
    const { user } = useAuthStore();

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        assetId: '',
        type: 'operation',
        title: '',
        description: '',
        status: 'open'
    });

    useEffect(() => {
        fetchLogs();
        fetchAssets();
    }, [fetchLogs, fetchAssets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addLog(formData);
        setShowModal(false);
        setFormData({ assetId: '', type: 'operation', title: '', description: '', status: 'open' });
        fetchLogs(); // refresh to get populated data
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'resolved': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Resolved</span>;
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
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex w-full sm:w-auto relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center px-4 py-2 bg-primary-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-primary-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Log Entry
                    </button>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                        <FileText className="h-12 w-12 text-gray-300 mb-3" />
                        <p>No log entries found.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {logs.map((log) => (
                            <li key={log._id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(log.status)}
                                        <span className="text-sm text-gray-500">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        {log.status === 'open' && (user?.role === 'admin' || user?._id === log.author._id) && (
                                            <button
                                                onClick={() => updateLogStatus(log._id, 'resolved')}
                                                className="text-xs font-medium text-primary-600 hover:text-primary-800"
                                            >
                                                Mark Resolved
                                            </button>
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
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Create Log Entry</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Asset</label>
                                <select required value={formData.assetId} onChange={e => setFormData({ ...formData, assetId: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2">
                                    <option value="" disabled>Select an Asset</option>
                                    {assets.map(a => (
                                        <option key={a._id} value={a._id}>{a.name} ({a.serialNumber})</option>
                                    ))}
                                </select>
                            </div>
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
                                <button type="submit" disabled={!formData.assetId} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50">Save Log Entry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logs;
