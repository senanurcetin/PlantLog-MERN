/**
 * CORS controls which browser origins may read API responses. It does not
 * authenticate requests; every protected endpoint still requires a bearer token.
 */
export const defaultDemoOrigins = [
    'http://localhost:5173',
    'http://localhost',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
] as const;

/**
 * A comma-separated override deliberately REPLACES the local allowlist.
 * Never use a wildcard or credentials-bearing URL. HTTPS is mandatory for
 * non-loopback origins in production.
 */
export const resolveAllowedOrigins = (
    configured: string | undefined = process.env.CORS_ORIGINS,
    environment: string | undefined = process.env.NODE_ENV,
): string[] => {
    if (configured === undefined) return [...defaultDemoOrigins];
    const entries = configured.split(',').map(value => value.trim());
    if (entries.length === 0 || entries.length > 16 || entries.some(value => !value)) {
        throw new Error('CORS_ORIGINS must contain 1–16 explicit origins');
    }
    const origins = new Set<string>();
    for (const entry of entries) {
        let url: URL;
        try {
            url = new URL(entry);
        } catch {
            throw new Error('CORS_ORIGINS contains an invalid URL origin');
        }
        // Equality to serialized URL origin rejects paths, trailing slashes,
        // userinfo, queries, fragments, default ports, and wildcard patterns.
        if (!['https:', 'http:'].includes(url.protocol) || url.origin !== entry ||
            url.username || url.password) {
            throw new Error('CORS_ORIGINS entries must be exact HTTP(S) origins');
        }
        const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        if (environment === 'production' && !isLoopback && url.protocol !== 'https:') {
            throw new Error('Non-loopback CORS origins require HTTPS in production');
        }
        origins.add(url.origin);
    }
    return [...origins];
};
