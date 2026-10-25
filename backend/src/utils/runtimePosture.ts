/**
 * PlantLog is a pre-production engineering prototype. A local API process
 * binds only to loopback by default. Docker may explicitly bind to its
 * internal network only when Compose also restricts host published ports.
 *
 * NODE_ENV=production selects Node runtime optimizations; it does not grant
 * deployment approval or change this network posture.
 */
export const resolveApiBindHost = (
    configured: string | undefined = process.env.API_BIND_HOST,
    containerOptIn: string | undefined = process.env.PLANTLOG_INTERNAL_CONTAINER_NETWORK,
): string => {
    const host = configured || '127.0.0.1';
    if (host === 'localhost') return '127.0.0.1';
    if (host === '127.0.0.1' || host === '::1') return host;
    if (host === '0.0.0.0' && containerOptIn === 'true') return host;
    throw new Error(
        'External API bind prohibited for pre-production demo; ' +
        'only loopback or explicit private-container networking is allowed',
    );
};
