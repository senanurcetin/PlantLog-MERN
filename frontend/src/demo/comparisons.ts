import { buildDemoInsights } from './insights';
import { assessDemoDataQuality } from './quality';
import type { DemoInsightAsset, DemoInsightLog } from './insights';

export interface ComparisonRow {
    id: string;
    title: string;
    assumption: string;
    records: number;
    openCases: number;
    equipmentAffected: number;
    unlinkedOpenCases: number;
    eligibleRecords: number;
    excludedRecords: number;
    deltaRecords: number;
    deltaOpenCases: number;
    deltaEquipment: number;
    deltaUnlinked: number;
}
const designs = [
    {id:'baseline', title:'Baseline fixture', type:null, status:null,
     assumption:'No additional record; original fictional observations only'},
    {id:'open-incident',title:'New unresolved incident',type:'incident',status:'open',
     assumption:'One additional incident record is created and stays open'},
    {id:'open-maintenance',title:'New unresolved maintenance',type:'maintenance',status:'open',
     assumption:'One scheduled-maintenance record is opened, with no implied breakdown'},
    {id:'resolved-incident',title:'Documented resolved incident',type:'incident',status:'resolved',
     assumption:'One incident record is created and is already resolved; no repair duration is inferred'},
    {id:'missing-link',title:'Unlinked unresolved incident',type:'incident',status:'open',
     assumption:'The added incident references an unknown fictional equipment identifier'},
] as const;

/** Controlled one-record perturbations. Not forecasting or causal inference. */
export const compareDemoCases = (
    assets: DemoInsightAsset[], records: DemoInsightLog[], snapshot: string,
): ComparisonRow[] => {
    const baseline = buildDemoInsights(assets, records, snapshot);
    // A controlled addition must itself have a unique event identity. Earlier
    // synthetic comparisons omitted IDs and silently failed the quality gate.
    const reservedIds = new Set(records.flatMap(record => {
        const id = (record as DemoInsightLog & { id?: string }).id;
        return typeof id === 'string' && id.trim() ? [id] : [];
    }));
    const identifier = (caseId: string): string => {
        let id = 'COMPARE-' + caseId;
        while (reservedIds.has(id)) id += '-NEXT';
        return id;
    };
    const anchor = assets.find(a => a.status !== 'decommissioned');
    if (!anchor) throw new Error('Comparison requires one in-service synthetic asset');
    return designs.map(design => {
        const extra = design.type === null ? [] : [{
            id: identifier(design.id),
            assetId: design.id === 'missing-link' ? 'FIXTURE-UNKNOWN' : anchor.id,
            type: design.type,
            status: design.status as 'open' | 'resolved',
            date: snapshot + 'T12:00:00.000Z',
        }];
        const hypothetical = [...records, ...extra];
        const outcome = buildDemoInsights(assets, hypothetical, snapshot);
        const audit = assessDemoDataQuality(assets, hypothetical, snapshot);
        return {
            id: design.id, title:design.title, assumption:design.assumption,
            records:outcome.totalRecords, openCases:outcome.openMaintenanceCases,
            eligibleRecords:audit.eligibleRecords,
            excludedRecords:audit.assessedRecords - audit.eligibleRecords,
            equipmentAffected:outcome.affectedEquipment, unlinkedOpenCases:outcome.unlinkedOpenCases,
            deltaRecords:outcome.totalRecords-baseline.totalRecords,
            deltaOpenCases:outcome.openMaintenanceCases-baseline.openMaintenanceCases,
            deltaEquipment:outcome.affectedEquipment-baseline.affectedEquipment,
            deltaUnlinked:outcome.unlinkedOpenCases-baseline.unlinkedOpenCases,
        };
    });
};
