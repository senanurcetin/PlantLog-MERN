export interface EquipmentCaseRecord {
    asset?: unknown;
    type: string;
    status: string;
    createdAt?: Date | string | null;
}
export interface EquipmentIdentity {
    _id: unknown;
    name: string;
    serialNumber: string;
    status: string;
}
export interface EquipmentCaseRow {
    assetId: string;
    name: string;
    serialNumber: string;
    status: string;
    openCases: number;
    incidents: number;
    maintenance: number;
}
export interface EquipmentCaseSummary {
    periodDays: number;
    from: string;
    to: string;
    totalOpenCases: number;
    linkedOpenCases: number;
    missingAssetCases: number;
    displayedOpenCases: number;
    remainingOpenCases: number;
    totalEquipment: number;
    displayedEquipment: number;
    items: EquipmentCaseRow[];
    interpretation: string;
}

const idOf = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    const serialized = String(value);
    return serialized === '[object Object]' ? '' : serialized;
};

/** Workload counts, not equipment failure risk or downtime measurements. */
export const summarizeEquipmentCases = (
    records: EquipmentCaseRecord[], assets: EquipmentIdentity[],
    periodDays: number, to: Date, limit = 10,
): EquipmentCaseSummary => {
    const end = to.getTime();
    const start = end - periodDays * 86400000;
    const assetMap = new Map(assets.map(asset => [idOf(asset._id), asset]));
    const grouped = new Map<string, EquipmentCaseRow>();
    let totalOpenCases = 0;
    let missingAssetCases = 0;
    for (const record of records) {
        const created = record.createdAt == null ? NaN : new Date(record.createdAt).getTime();
        if (!Number.isFinite(created) || created < start || created > end ||
            !['incident', 'maintenance'].includes(record.type) || record.status === 'resolved') continue;
        totalOpenCases++;
        const assetId = idOf(record.asset);
        const asset = assetMap.get(assetId);
        if (!asset) { missingAssetCases++; continue; }
        let row = grouped.get(assetId);
        if (!row) {
            row = {
                assetId, name: asset.name, serialNumber: asset.serialNumber,
                status: asset.status, openCases: 0, incidents: 0, maintenance: 0,
            };
            grouped.set(assetId, row);
        }
        row.openCases++;
        if (record.type === 'incident') row.incidents++;
        else row.maintenance++;
    }
    const ranked = [...grouped.values()].sort((a, b) =>
        b.openCases - a.openCases || b.incidents - a.incidents ||
        a.serialNumber.localeCompare(b.serialNumber) || a.assetId.localeCompare(b.assetId));
    const items = ranked.slice(0, limit);
    const linkedOpenCases = totalOpenCases - missingAssetCases;
    const displayedOpenCases = items.reduce((total, row) => total + row.openCases, 0);
    return {
        periodDays, from: new Date(start).toISOString(), to: to.toISOString(),
        totalOpenCases, linkedOpenCases, missingAssetCases,
        displayedOpenCases, remainingOpenCases: linkedOpenCases - displayedOpenCases,
        totalEquipment: ranked.length, displayedEquipment: items.length, items,
        interpretation: 'Unresolved incident and maintenance records created within the selected period, grouped by existing equipment. Counts describe workload, not risk, downtime, failure rate, MTTR or MTBF. Missing equipment links and other equipment groups are reported.',
    };
};
