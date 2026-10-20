export interface DemoInsightAsset {
    id: string;
    name: string;
    serialNumber: string;
    status: string;
}
export interface DemoInsightLog {
    assetId: string;
    type: string;
    status: string;
    date: string;
}
export interface DailyIntake {
    day: string;
    incident: number;
    maintenance: number;
    inspection: number;
    operation: number;
    total: number;
}
export interface EquipmentWorkload {
    id: string;
    name: string;
    serialNumber: string;
    status: string;
    incidents: number;
    maintenance: number;
    openCases: number;
}
export interface DemoInsightsSummary {
    totalRecords: number;
    openMaintenanceCases: number;
    otherOpenEntries: number;
    affectedEquipment: number;
    unlinkedOpenCases: number;
    byType: Record<'incident'|'maintenance'|'inspection'|'operation',number>;
    equipment: EquipmentWorkload[];
    dailyIntake: DailyIntake[];
    outsideWindow: number;
    windowDays: number;
    snapshot: string;
}

/**
 * Static, descriptive analytics from the public fictional fixture only.
 * No inference about uptime, failure probability, MTTR, or MTBF.
 */
export const buildDemoInsights = (
    assets: DemoInsightAsset[], logs: DemoInsightLog[], snapshot: string,
    windowDays = 8,
): DemoInsightsSummary => {
    const days = Math.max(1, Math.min(31, Math.floor(windowDays)));
    const date = new Date(snapshot + 'T00:00:00.000Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== snapshot) {
        throw new Error('Invalid UTC snapshot date');
    }
    const buckets: DailyIntake[] = Array.from({length: days}, (_, index) => {
        const day = new Date(date.getTime() - (days - index - 1) * 86400000)
            .toISOString().slice(0, 10);
        return {day, incident: 0, maintenance: 0, inspection: 0, operation: 0, total: 0};
    });
    const allowed = ['incident','maintenance','inspection','operation'] as const;
    const byType: DemoInsightsSummary['byType'] = {
        incident: 0, maintenance: 0, inspection: 0, operation: 0,
    };
    const assetsById = new Map(assets.map(asset => [asset.id, asset]));
    const equipment = new Map<string,EquipmentWorkload>();
    let openMaintenanceCases = 0;
    let otherOpenEntries = 0;
    let unlinkedOpenCases = 0;
    let outsideWindow = 0;
    const byDay = new Map(buckets.map((bucket) => [bucket.day, bucket]));
    for (const log of logs) {
        if (!allowed.includes(log.type as typeof allowed[number])) {
            throw new Error('Unsupported record type in synthetic demo');
        }
        const type = log.type as typeof allowed[number];
        byType[type] += 1;
        const day = log.date.slice(0, 10);
        const bucket = byDay.get(day);
        if (bucket) {
            bucket[type] += 1;
            bucket.total += 1;
        } else {
            outsideWindow += 1;
        }
        if (log.status === 'resolved') continue;
        if (type !== 'incident' && type !== 'maintenance') {
            otherOpenEntries += 1;
            continue;
        }
        openMaintenanceCases += 1;
        const asset = assetsById.get(log.assetId);
        if (!asset) {
            unlinkedOpenCases += 1;
            continue;
        }
        let group = equipment.get(asset.id);
        if (!group) {
            group = {
                id: asset.id, name: asset.name, serialNumber: asset.serialNumber,
                status: asset.status, openCases: 0, incidents: 0, maintenance: 0,
            };
            equipment.set(asset.id, group);
        }
        group.openCases += 1;
        if (type === 'incident') group.incidents += 1;
        else group.maintenance += 1;
    }
    const ranked = [...equipment.values()].sort((a,b) =>
        b.openCases - a.openCases || b.incidents - a.incidents ||
        a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    return {
        totalRecords: logs.length, openMaintenanceCases, otherOpenEntries,
        affectedEquipment: ranked.length, unlinkedOpenCases, equipment: ranked,
        byType, dailyIntake: buckets, outsideWindow, windowDays: days, snapshot,
    };
};
