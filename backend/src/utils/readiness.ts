/** Pre-production readiness is NOT a certification of plant or user safety. */
export type ReadinessState =
    | { status: 'ready'; httpStatus: 200 }
    | { status: 'unavailable'; httpStatus: 503 };

/** Fast, side-effect-free signal. Does not claim a successful database ping. */
export const evaluateReadiness = (mongoReadyState: number, draining: boolean): ReadinessState =>
    mongoReadyState === 1 && !draining
        ? { status: 'ready', httpStatus: 200 }
        : { status: 'unavailable', httpStatus: 503 };

let draining = false;
export const beginShutdown = (): void => { draining = true; };
export const isDraining = (): boolean => draining;
