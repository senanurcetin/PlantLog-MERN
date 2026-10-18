import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssetStore, type Asset } from '../store/assetStore';
import { Plus, Search } from 'lucide-react';
import { filterAssets } from '../utils/registryFilters';

const Assets = () => {
    const { assets, isLoading, error, fetchAssets, addAsset } = useAssetStore();
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [submitError, setSubmitError] = useState('');
    const filteredAssets = useMemo(() => filterAssets(assets, query, statusFilter), [assets, query, statusFilter]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        serialNumber: '',
        category: 'machinery',
        location: ''
    });

    useEffect(() => {
        void fetchAssets();
    }, [fetchAssets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        try {
            await addAsset(formData);
            setShowModal(false);
            setFormData({ name: '', serialNumber: '', category: 'machinery', location: '' });
        } catch {
            setSubmitError(useAssetStore.getState().error || 'Unable to save this asset');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'operational': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Operational</span>;
            case 'maintenance': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Maintenance</span>;
            default: return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Offline</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <label className="relative">
                        <span className="sr-only">Search assets</span>
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
                        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search assets, serial or location..."
                            className="w-full sm:w-72 pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-primary-500 focus:border-primary-500" />
                    </label>
                    <label>
                        <span className="sr-only">Filter assets by status</span>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500">
                            <option value="all">All statuses</option>
                            <option value="operational">Operational</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="decommissioned">Decommissioned</option>
                        </select>
                    </label>
                </div>
                <button type="button" onClick={() => { setSubmitError(''); setShowModal(true); }}
                    className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Add Asset
                </button>
            </div>
            {error && !showModal && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error} <button type="button" onClick={() => void fetchAssets()} className="ml-2 font-semibold underline">Retry</button>
                </div>
            )}
            {/* Table Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Info</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading assets...</td></tr>
                            ) : filteredAssets.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No assets match the current search or filter.</td></tr>
                            ) : (
                                filteredAssets.map((asset) => (
                                    <tr key={asset._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                    <span className="text-gray-500 font-bold uppercase">{asset.name.substring(0, 2)}</span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                                                    <div className="text-sm text-gray-500 capitalize">{asset.category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {asset.serialNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(asset.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {asset.location}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button type="button" onClick={() => setSelectedAsset(asset)} className="text-primary-600 font-semibold hover:text-primary-900 hover:underline">View</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-gray-500" aria-live="polite">Showing {filteredAssets.length} of {assets.length} registered assets.</p>
            {selectedAsset && (
                <section aria-label="Selected asset details" className="rounded-xl border border-teal-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{selectedAsset.name}</h2>
                            <p className="mt-1 font-mono text-sm text-gray-600">{selectedAsset.serialNumber}</p>
                        </div>
                        <button type="button" onClick={() => setSelectedAsset(null)} className="text-sm text-gray-600 underline hover:text-gray-900">Close details</button>
                    </div>
                    <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div><dt className="text-gray-500">Location</dt><dd className="mt-1 font-semibold">{selectedAsset.location}</dd></div>
                        <div><dt className="text-gray-500">Category</dt><dd className="mt-1 font-semibold capitalize">{selectedAsset.category}</dd></div>
                        <div><dt className="text-gray-500">Status</dt><dd className="mt-1">{getStatusBadge(selectedAsset.status)}</dd></div>
                    </dl>
                    <Link to={`/logs?assetId=${encodeURIComponent(selectedAsset._id)}`}
                        className="mt-5 inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                        View maintenance history →
                    </Link>
                </section>
            )}
            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Register New Asset</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {submitError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</p>}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                                <input required type="text" value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2">
                                    <option value="machinery">Machinery</option>
                                    <option value="vehicle">Vehicle</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location</label>
                                <input required type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2" />
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50">{isLoading ? 'Saving…' : 'Save Asset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assets;
