export type ScenarioPhase = 'idle' | 'open' | 'acknowledged' | 'in_progress' | 'resolved';
export type ScenarioAction = 'report' | 'acknowledge' | 'start' | 'resolve' | 'reset';

export interface ScenarioState {
    phase: ScenarioPhase;
    assetId: string | null;
}

export interface ScenarioAsset {
    id: string;
    name: string;
    status: string;
}

export interface ScenarioLog {
    id: string;
    assetId: string;
    type: 'incident';
    status: Exclude<ScenarioPhase, 'idle'>;
    title: string;
    description: string;
    date: string;
    reportedBy: string;
    statusHistory: Array<{
        from: string | null;
        to: string;
        changedAt: string;
        changedBy: string;
    }>;
}

export const emptyScenario: ScenarioState = { phase: 'idle', assetId: null };

// The scenario is a single, explicitly fictional in-memory case. It does not
// change or replace any bundled records. No browser storage or API is used.
const progression = ['open', 'acknowledged', 'in_progress', 'resolved'] as const;
const actions: Record<Exclude<ScenarioAction, 'reset'>, ScenarioPhase> = {
    report: 'open',
    acknowledge: 'acknowledged',
    start: 'in_progress',
    resolve: 'resolved',
};

export const advanceScenario = (
    current: ScenarioState, action: ScenarioAction,
    chosenAssetId: string, assets: ScenarioAsset[],
): ScenarioState => {
    if (action === 'reset') return { ...emptyScenario };
    const target = actions[action];
    if (action === 'report') {
        if (current.phase !== 'idle') throw new Error('Reset the example before opening another case');
        const asset = assets.find(item => item.id === chosenAssetId);
        if (!asset || asset.status === 'decommissioned') {
            throw new Error('Select an existing, in-service fictional equipment record');
        }
        return { assetId: asset.id, phase: target };
    }
    const currentIndex = progression.indexOf(current.phase as typeof progression[number]);
    const nextIndex = progression.indexOf(target as typeof progression[number]);
    if (current.assetId === null || currentIndex < 0 || nextIndex !== currentIndex + 1) {
        throw new Error('The demonstration lifecycle advances one verified step at a time');
    }
    return { assetId: current.assetId, phase: target };
};

export const scenarioToLog = (scenario: ScenarioState, snapshot: string): ScenarioLog | null => {
    if (scenario.phase === 'idle' || scenario.assetId === null) return null;
    const anchor = new Date(snapshot + 'T17:00:00.000Z');
    if (Number.isNaN(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== snapshot) {
        throw new Error('Invalid fictional snapshot date');
    }
    const last = progression.indexOf(scenario.phase);
    const events = progression.slice(0, last + 1).map((to, index) => ({
        from: index === 0 ? null : progression[index - 1],
        to,
        changedAt: new Date(anchor.getTime() + index * 15 * 60000).toISOString(),
        changedBy: 'Fictional demo operator',
    }));
    return {
        id: 'SIM-001',
        assetId: scenario.assetId,
        type: 'incident',
        status: scenario.phase,
        title: 'Simulated sensor anomaly — demonstration only',
        description: 'A visitor-triggered fictional incident. The entry exists only in this browser tab and disappears after a reset or page reload.',
        date: anchor.toISOString(),
        reportedBy: 'Fictional demo operator',
        statusHistory: events,
    };
};
