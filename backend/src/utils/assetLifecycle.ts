import { InvalidPayloadError } from './inputPolicy';

export type AssetStatus = 'operational' | 'maintenance' | 'decommissioned';

const transitions: Readonly<Record<AssetStatus, readonly AssetStatus[]>> = {
    operational: ['maintenance', 'decommissioned'],
    maintenance: ['operational', 'decommissioned'],
    decommissioned: [],
};

/**
 * Decommissioning is terminal in this demonstrator.
 * Identical statuses are no-ops; a history item is written only on a change.
 */
export const validateAssetStatusTransition = (
    current: AssetStatus, requested: AssetStatus,
): boolean => {
    if (current === requested) return false;
    if (!transitions[current]?.includes(requested)) {
        throw new InvalidPayloadError('Invalid asset status transition from ' + current + ' to ' + requested);
    }
    return true;
};
