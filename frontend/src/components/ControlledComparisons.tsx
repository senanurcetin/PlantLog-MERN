import { compareDemoCases } from '../demo/comparisons';
import type { DemoInsightAsset, DemoInsightLog } from '../demo/insights';

const delta = (value:number) => value > 0 ? '+' + value : String(value);

const ControlledComparisons = ({assets,logs,snapshot}:{
    assets:DemoInsightAsset[];logs:DemoInsightLog[];snapshot:string;
}) => {
    const cases=compareDemoCases(assets,logs,snapshot);
    return <section className="nexus-card min-w-0 max-w-full overflow-hidden p-5 sm:p-6"
        aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className="text-lg font-bold text-slate-900">
            Controlled fictional case comparisons
        </h2>
        <p className="mt-2 text-sm text-slate-600">
            Exactly one identified extra record per nonbaseline comparison, using the same fixture and observation date.
            The quality-eligible column independently excludes invalid references.
            These rows are not predictions, failure probabilities, or causal effects.
        </p>
        <div className="mt-5 w-full overflow-x-auto" role="region"
            tabIndex={0} aria-label="Controlled example comparison table, scroll horizontally">
            <table className="min-w-[800px] w-full text-left text-sm">
                <caption className="sr-only">One-record synthetic perturbations versus unmodified baseline</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
                    <tr>
                        <th className="p-3" scope="col">Hypothetical case</th>
                        <th className="p-3 text-right" scope="col">Raw logs</th>
                        <th className="p-3 text-right" scope="col">Eligible logs</th>
                        <th className="p-3 text-right" scope="col">Open cases</th>
                        <th className="p-3 text-right" scope="col">Affected assets</th>
                        <th className="p-3 text-right" scope="col">Unlinked cases</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {cases.map(entry=><tr key={entry.id}>
                        <th scope="row" className="p-3">
                            <span className="font-semibold text-slate-900">{entry.title}</span>
                            <span className="mt-1 block max-w-xs text-xs font-normal text-slate-600">{entry.assumption}</span>
                        </th>
                        <td className="p-3 text-right tabular-nums">{entry.records}
                            <span className="block text-xs text-slate-500">{delta(entry.deltaRecords)} vs baseline</span>
                        </td>
                        <td className="p-3 text-right tabular-nums">{entry.eligibleRecords}
                            <span className="block text-xs text-slate-500">{entry.excludedRecords} excluded</span>
                        </td>
                        <td className="p-3 text-right tabular-nums">{entry.openCases}
                            <span className="block text-xs text-slate-500">{delta(entry.deltaOpenCases)} vs baseline</span>
                        </td>
                        <td className="p-3 text-right tabular-nums">{entry.equipmentAffected}
                            <span className="block text-xs text-slate-500">{delta(entry.deltaEquipment)} vs baseline</span>
                        </td>
                        <td className="p-3 text-right tabular-nums">{entry.unlinkedOpenCases}
                            <span className="block text-xs text-slate-500">{delta(entry.deltaUnlinked)} vs baseline</span>
                        </td>
                    </tr>)}
                </tbody>
            </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
            Every counterfactual starts from the same baseline. The unlinked example
            intentionally tests an invalid equipment reference: its workload remains
            in the raw count but its record is excluded from eligible logs. No assumptions about repair time,
            mechanical risk, or observed industrial performance are introduced.
        </p>
    </section>;
};
export default ControlledComparisons;
