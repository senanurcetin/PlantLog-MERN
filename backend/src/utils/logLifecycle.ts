import { InvalidPayloadError } from './inputPolicy';

export type LogStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved';
export type LifecycleTimestamp = 'acknowledgedAt' | 'workStartedAt' | 'resolvedAt';
export const allowedTransitions: Readonly<Record<LogStatus, readonly LogStatus[]>> = {
    open: ['acknowledged', 'resolved'],
    acknowledged: ['in_progress', 'resolved'],
    in_progress: ['resolved'],
    resolved: [],
};

/**
 * A lifecycle records an observation, not equipment downtime.
 * The server creates timestamps; request bodies may not supply them.
 */
export const statusTransition = (previous: LogStatus, next: LogStatus): LifecycleTimestamp | null => {
    if (previous === next) return null;
    if (!allowedTransitions[previous]?.includes(next)) {
        throw new InvalidPayloadError(`Invalid status transition from ${previous} to ${next}`);
    }
    if (next === 'acknowledged') return 'acknowledgedAt';
    if (next === 'in_progress') return 'workStartedAt';
    return 'resolvedAt';
};
