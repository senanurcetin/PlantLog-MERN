import { useState } from 'react';
import { ArrowRight, RotateCcw, ShieldCheck, FlaskConical, CircleCheck, CircleDot, AlertCircle } from 'lucide-react';
import type { ScenarioAction, ScenarioAsset, ScenarioState } from '../demo/scenario';
import { buildDemoInsights } from '../demo/insights';
import fixture from '../demo/fixture.json';
import { scenarioToLog } from '../demo/scenario';

interface Props {
    assets: (ScenarioAsset & { serialNumber: string })[];
    scenario: ScenarioState;
    onAction: (action: ScenarioAction, assetId: string) => void;
    onInspect: (assetId: string) => void;
}

const steps = [
    {phase: 'open', title: 'Report', description: 'Create a fictional sensor incident', action: 'report'},
    {phase: 'acknowledged', title: 'Acknowledge', description: 'Record that the case was received', action: 'acknowledge'},
    {phase: 'in_progress', title: 'In progress', description: 'Start the illustrative response', action: 'start'},
    {phase: 'resolved', title: 'Resolve', description: 'Close the demonstration lifecycle', action: 'resolve'},
] as const;

const ScenarioLab = ({assets,scenario,onAction,onInspect}:Props) => {
    const available=assets.filter(asset=>asset.status!=='decommissioned');
    const [selected,setSelected]=useState(available[0]?.id||'');
    const currentAssetId=scenario.assetId||selected;
    const currentAsset=assets.find(item=>item.id===currentAssetId);
    const stage=steps.findIndex(step=>step.phase===scenario.phase);
    const simulated=scenarioToLog(scenario,fixture.context.snapshot);
    const baseline=buildDemoInsights(fixture.assets,fixture.logs,fixture.context.snapshot);
    const preview=buildDemoInsights(fixture.assets,simulated?[simulated,...fixture.logs]:fixture.logs,fixture.context.snapshot);
    return (
        <div className="space-y-5" aria-label="Temporary maintenance scenario laboratory">
            <section className="nexus-card overflow-hidden">
                <div className="nexus-hero rounded-none border-0 p-6 sm:p-8 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#8F9BFF]">
                            <FlaskConical size={18} aria-hidden="true"/> NEXUS Simulation Lab
                        </span>
                        <span className="rounded-full border border-[#8F9BFF]/50 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                            Memory only · Not a production record
                        </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Explore a maintenance case lifecycle</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-200">
                        Practice a fictional incident from report to resolution. Observe changes
                        in the example logbook and analytics without creating any real work orders.
                        Reloading or resetting restores the original dataset.
                    </p>
                </div>
                <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="min-w-0">
                        <label htmlFor="scenario-equipment" className="block text-sm font-bold text-slate-900">
                            Fictional equipment
                        </label>
                        <select id="scenario-equipment" value={currentAssetId}
                            disabled={scenario.phase!=='idle'}
                            onChange={event=>setSelected(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:bg-slate-100">
                            {available.map(asset=><option key={asset.id} value={asset.id}>
                                {asset.name} — {asset.serialNumber}
                            </option>)}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">
                            Decommissioned equipment is excluded. To select another asset, reset the simulation.
                        </p>

                        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4" aria-live="polite">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-800">Current scenario</p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {scenario.phase==='idle'?'Not started':scenario.phase.replace('_',' ')}
                            </p>
                            <p className="mt-2 text-sm text-slate-700">
                                {scenario.phase==='idle'
                                  ? 'No simulated case has been created. The public fixture remains unchanged.'
                                  : `SIM-001 · ${currentAsset?.name||'Fictional asset'} · This tab only`}
                            </p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {scenario.phase==='idle'
                                ? <button type="button" onClick={()=>onAction('report',selected)}
                                    disabled={!selected} className="nexus-action inline-flex items-center gap-2 rounded-xl px-5 py-3
                                        text-sm font-bold disabled:opacity-50">
                                    Report fictional incident <ArrowRight size={17} aria-hidden="true"/>
                                </button>
                                : stage<3
                                    ? <button type="button"
                                        onClick={()=>onAction(steps[stage+1].action,currentAssetId)}
                                        className="nexus-action inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold">
                                        {steps[stage+1].title} case <ArrowRight size={17} aria-hidden="true"/>
                                    </button>
                                    : <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                                        <CircleCheck size={17} aria-hidden="true"/> Demo case resolved
                                    </span>}
                            <button type="button" onClick={()=>onAction('reset',currentAssetId)}
                                disabled={scenario.phase==='idle'}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3
                                    text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40">
                                <RotateCcw size={16} aria-hidden="true"/> Reset simulation
                            </button>
                        </div>
                        {scenario.phase!=='idle'&&scenario.assetId&&
                          <button type="button" onClick={()=>onInspect(scenario.assetId!)}
                              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-800 hover:underline">
                              View simulated case in Maintenance log <ArrowRight size={17} aria-hidden="true"/>
                          </button>}
                    </div>

                    <section aria-label="Scenario lifecycle stages" className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900">Illustrative audit progression</h3>
                        <ol className="mt-3 space-y-2">
                            {steps.map((step,index)=>(
                                <li key={step.phase} className={`flex gap-3 rounded-xl border px-4 py-3
                                    ${stage===index?'border-blue-300 bg-blue-50':
                                        stage>index?'border-emerald-200 bg-emerald-50/50':'border-slate-200 bg-slate-50'}`}>
                                    {stage>=index
                                      ? <CircleCheck size={21} className={stage===index?'shrink-0 text-blue-700':'shrink-0 text-emerald-700'} aria-hidden="true"/>
                                      : <CircleDot size={21} className="shrink-0 text-slate-400" aria-hidden="true"/>}
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{index+1}. {step.title}</p>
                                        <p className="mt-1 text-xs text-slate-600">{step.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </section>
                </div>
            </section>

            <section className="nexus-card p-5 sm:p-7" aria-labelledby="scenario-comparison">
                <h2 id="scenario-comparison" className="text-lg font-bold text-slate-900">See the effect on recorded workload</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Baseline and temporary scenario use the same fictional snapshot date.
                    Only one synthetic incident can be added.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {([
                        {title:'Total log entries',before:baseline.totalRecords,after:preview.totalRecords},
                        {title:'Open maintenance cases',before:baseline.openMaintenanceCases,after:preview.openMaintenanceCases},
                        {title:'Equipment with open cases',before:baseline.affectedEquipment,after:preview.affectedEquipment},
                    ] as const).map(item=><div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="text-xs font-semibold text-slate-600">{item.title}</h3>
                        <div className="mt-3 flex items-end gap-3">
                            <span className="text-lg font-medium tabular-nums text-slate-500">{item.before}</span>
                            <ArrowRight size={15} className="mb-2 text-slate-400" aria-hidden="true"/>
                            <span className="text-3xl font-extrabold tabular-nums text-slate-900">{item.after}</span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-blue-800">
                            {item.after===item.before?'No change':
                             `${item.after>item.before?'+':''}${item.after-item.before} simulated`}
                        </p>
                    </div>)}
                </div>
                <div className="mt-5 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
                    <ShieldCheck size={19} className="shrink-0" aria-hidden="true"/>
                    <p>No writes, browser storage, remote API calls, accounts, payments, or plant control.
                        Status events are fictional and are never presented as a real maintenance SLA,
                        measured downtime, or predicted failure risk.</p>
                </div>
                {scenario.phase!=='idle'&&scenario.phase!=='resolved'&&
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
                        <AlertCircle size={16} aria-hidden="true"/> This fictional case remains unresolved until you resolve or reset it.
                    </p>}
            </section>
        </div>
    );
};
export default ScenarioLab;
