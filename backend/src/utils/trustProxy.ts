/**
 * Explicit reverse-proxy trust. `TRUST_PROXY_HOPS` is the number of proxies in
 * front of the API (for example 1 behind a single ingress). Unset, empty or 0
 * means "no trusted proxy": the client address is the socket address and any
 * caller-supplied X-Forwarded-For header is ignored.
 */
export const resolveTrustProxyHops = (raw: string | undefined = process.env.TRUST_PROXY_HOPS): number => {
    if (raw === undefined || raw.trim() === '') return 0;
    const value = raw.trim();
    if (!/^\d{1,2}$/.test(value)) {
        throw new Error('TRUST_PROXY_HOPS must be a whole number between 0 and 10');
    }
    const hops = Number(value);
    if (hops > 10) throw new Error('TRUST_PROXY_HOPS must be a whole number between 0 and 10');
    return hops;
};
