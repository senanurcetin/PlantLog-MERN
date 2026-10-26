import { advanceScenario, emptyScenario, scenarioToLog } from './scenario';
import type { ScenarioAction, ScenarioAsset, ScenarioPhase, ScenarioState } from './scenario';
import { assessLifecycleTraceability } from './traceability';
import { assessDemoDataQuality } from './quality';

export interface ScenarioModelEvidence {
    actionAlphabet: number;
    maximumSequenceLength: number;
    exploredPrefixes: number;
    acceptedActions: number;
    rejectedActions: number;
    resetActions: number;
    checkedScenarioRecords: number;
    idlePrefixes: number;
    distinctPhases: ScenarioPhase[];
}

const actions: readonly ScenarioAction[] = ['report', 'acknowledge', 'start', 'resolve', 'reset'];
const phases: readonly ScenarioPhase[] = ['idle', 'open', 'acknowledged', 'in_progress', 'resolved'];
const forward: Readonly<Record<ScenarioPhase, Partial<Record<ScenarioAction, ScenarioPhase>>>> = {
    idle: { report: 'open' },
    open: { acknowledge: 'acknowledged' },
    acknowledged: { start: 'in_progress' },
    in_progress: { resolve: 'resolved' },
    resolved: {},
};

/**
 * Exhaustive, fixed-depth reference-model exploration for a LOCAL fictional
 * scenario only. Invalid actions are rejected, and the reference state remains
 * unchanged; this enumerates all attempted action sequences, not just happy paths.
 * No random seed, clock, file I/O, user data, API or browser storage.
 */
export const runScenarioModelCheck = (
    assets: ScenarioAsset[], snapshot: string,
): ScenarioModelEvidence => {
    const asset = assets.find(item => item.id === 'A03' && item.status !== 'decommissioned');
    if (!asset) throw new Error('Model check needs fictional, in-service A03');
    const maximumSequenceLength = 6;
    let exploredPrefixes = 0;
    let acceptedActions = 0;
    let rejectedActions = 0;
    let resetActions = 0;
    let checkedScenarioRecords = 0;
    let idlePrefixes = 0;
    const reached = new Set<ScenarioPhase>();

    const inspect = (state: ScenarioState, depth: number): void => {
        exploredPrefixes++;
        reached.add(state.phase);
        const log = scenarioToLog(state, snapshot);
        if (state.phase === 'idle') {
            idlePrefixes++;
            if (state.assetId !== null || log !== null) {
                throw new Error('Idle model state must not retain a fictional case');
            }
        } else {
            const expectedLength = phases.indexOf(state.phase);
            if (!log || log.status !== state.phase ||
                log.assetId !== asset.id || log.statusHistory.length !== expectedLength) {
                throw new Error('Fictional scenario state/history mismatch');
            }
            const history = assessLifecycleTraceability([log], snapshot);
            if (history.assessedRecords !== 1 || history.verifiedHistory !== 1 ||
                history.invalidHistory !== 0 || history.missingHistory !== 0) {
                throw new Error('Model-created fictional timeline is not internally consistent');
            }
            const eligible = assessDemoDataQuality(assets, [{ ...log }], snapshot);
            if (eligible.eligibleRecords !== 1) {
                throw new Error('Model-created scenario is not a quality-eligible sample');
            }
            checkedScenarioRecords++;
        }
        if (depth === maximumSequenceLength) return;

        for (const action of actions) {
            // Selection changes after report must not alter the active asset.
            const selected = state.phase === 'idle' ? asset.id : 'not-the-selected-asset';
            const expectedPhase = action === 'reset' ? 'idle' : forward[state.phase][action];
            const originalState = JSON.stringify(state);
            let next: ScenarioState = state;
            if (expectedPhase === undefined) {
                try {
                    advanceScenario(state, action, selected, assets);
                    throw new Error('Invalid fictional action unexpectedly accepted');
                } catch (error) {
                    if (!(error instanceof Error) ||
                        error.message === 'Invalid fictional action unexpectedly accepted') {
                        throw error;
                    }
                    rejectedActions++;
                }
            } else {
                next = advanceScenario(state, action, selected, assets);
                if (next.phase !== expectedPhase ||
                    next.assetId !== (expectedPhase === 'idle' ? null : asset.id)) {
                    throw new Error('Scenario disagrees with independent transition oracle');
                }
                if (action === 'reset') resetActions++;
                else acceptedActions++;
            }
            if (JSON.stringify(state) !== originalState) {
                throw new Error('Scenario action unexpectedly mutated its input');
            }
            inspect(next, depth + 1);
        }
    };
    inspect({ ...emptyScenario }, 0);
    if (exploredPrefixes !== (5 ** 7 - 1) / 4 ||
        acceptedActions + rejectedActions + resetActions !== exploredPrefixes - 1 ||
        reached.size !== phases.length) {
        throw new Error('Incomplete or inconsistent exhaustive scenario exploration');
    }
    return {
        actionAlphabet: actions.length,
        maximumSequenceLength,
        exploredPrefixes,
        acceptedActions,
        rejectedActions,
        resetActions,
        checkedScenarioRecords,
        idlePrefixes,
        distinctPhases: phases.filter(phase => reached.has(phase)),
    };
};
