import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface EquipmentRow {
    assetId: string;
    name: string;
    serialNumber: string;
    status: string;
    openCases: number;
    incidents: number;
    maintenance: number;
}
interface EquipmentResponse {
    totalOpenCases: number;
    olderOpenCases: number;
    undatedOpenCases: number;
    futureDatedOpenCases: number;
    linkedOpenCases: number;
    missingAssetCases: number;
    displayedOpenCases: number;
    remainingOpenCases: number;
    totalEquipment: number;
    displayedEquipment: number;
    items: EquipmentRow[];
    interpretation: string;
}

const EquipmentCasePanel = ({ days, reload }: { days: number; reload: number }) => {
    const [data, setData] = useState<EquipmentResponse | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError('');
        setData(null);
        api.get<EquipmentResponse>('/analytics/equipment', { params: { days } })
            .then(response => { if (active) setData(response.data); })
            .catch((failure: unknown) => {
                if (!active) return;
                const responseError = failure as { response?: { data?: { message?: string } } };
                setError(responseError.response?.data?.message || 'Equipment-level analytics unavailable.');
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [days, reload]);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            aria-labelledby="equipment-case-title">
            <h2 id="equipment-case-title" className="text-lg font-bold">Equipment with open maintenance cases</h2>
            <p className="mt-2 text-sm text-slate-600">
                Currently unresolved incident/maintenance records created in the last {days} days.
                Ordered by case count, not predicted failure risk.
            </p>
            {loading ? <p role="status" className="mt-4 text-sm">Loading equipment workload…</p> :
                error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> :
                    data ? <>
                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {([
                                ['Open cases in period', data.totalOpenCases],
                                ['Equipment with cases', data.totalEquipment],
                                ['Cases with missing asset links', data.missingAssetCases],
                            ] as const).map(([name, count]) => (
                                <div key={name} className="rounded-xl bg-teal-50 p-4">
                                    <p className="text-xs font-semibold text-slate-700">{name}</p>
                                    <p className="mt-1 text-2xl font-bold tabular-nums">{count}</p>
                                </div>
                            ))}
                        </div>
                        {(data.olderOpenCases > 0 || data.undatedOpenCases > 0 ||
                            data.futureDatedOpenCases > 0) && (
                            <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                <p className="font-semibold">Open cases outside this reporting period</p>
                                <p className="mt-1">
                                    {data.olderOpenCases} cases created before the reporting window,
                                    {' '}{data.undatedOpenCases} with missing creation dates,
                                    and {data.futureDatedOpenCases} with future-dated timestamps.
                                </p>
                                <p className="mt-2 text-xs">
                                    These unresolved cases are excluded from the period-specific equipment ranking,
                                    not from the overall maintenance obligations.
                                </p>
                            </div>
                        )}
                        {data.items.length === 0 ? (
                            <p role="status" className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
                                {data.totalOpenCases === 0
                                    ? 'No unresolved incident or maintenance cases were created in this period. Older cases, if present, are reported separately above.'
                                    : 'No existing equipment matches these cases. Missing links are counted above.'}
                            </p>
                        ) : <div className="mt-5 overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                                    <tr>
                                        <th scope="col" className="p-3">Equipment</th>
                                        <th scope="col" className="p-3">Status</th>
                                        <th scope="col" className="p-3 text-right">Incidents</th>
                                        <th scope="col" className="p-3 text-right">Maintenance</th>
                                        <th scope="col" className="p-3 text-right">Open</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.items.map(item => (
                                        <tr key={item.assetId}>
                                            <td className="p-3">
                                                <Link to={'/logs?assetId=' + encodeURIComponent(item.assetId)}
                                                    className="font-semibold text-teal-800 hover:underline">{item.name}</Link>
                                                <span className="block text-xs text-slate-500">{item.serialNumber}</span>
                                            </td>
                                            <td className="p-3 capitalize">{item.status}</td>
                                            <td className="p-3 text-right tabular-nums">{item.incidents}</td>
                                            <td className="p-3 text-right tabular-nums">{item.maintenance}</td>
                                            <td className="p-3 text-right font-bold tabular-nums">{item.openCases}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>}
                        <p className="mt-4 text-sm text-slate-600">
                            Showing {data.displayedEquipment} of {data.totalEquipment} linked equipment groups:
                            {data.displayedOpenCases} displayed cases, {data.remainingOpenCases} in other groups,
                            and {data.missingAssetCases} without a valid equipment link.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Detail links show the full asset log, including older and resolved entries.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">{data.interpretation}
                            Outside-period counts come from separate queries and may change during concurrent edits.
                        </p>
                    </> : null}
        </section>
    );
};
export default EquipmentCasePanel;
