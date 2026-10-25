import { AuditAction, AuditOutcome } from '../models/AuditEvent';

/** Route constants only; query strings, request bodies, passwords, bearer
 * tokens and user-supplied event labels MUST NEVER be audit metadata. */
const routes: ReadonlyArray<{
    method: string;
    pattern: RegExp;
    action: AuditAction;
    resourceType: 'auth' | 'asset' | 'log' | 'audit';
}> = [
    { method: 'POST', pattern: /^\/api\/auth\/register\/?$/, action: 'auth.register', resourceType: 'auth' },
    { method: 'POST', pattern: /^\/api\/auth\/login\/?$/, action: 'auth.login', resourceType: 'auth' },
    { method: 'POST', pattern: /^\/api\/auth\/logout\/?$/, action: 'auth.logout', resourceType: 'auth' },
    { method: 'POST', pattern: /^\/api\/assets\/?$/, action: 'asset.create', resourceType: 'asset' },
    { method: 'PUT', pattern: /^\/api\/assets\/([a-f\d]{24})\/?$/i, action: 'asset.update', resourceType: 'asset' },
    { method: 'DELETE', pattern: /^\/api\/assets\/([a-f\d]{24})\/?$/i, action: 'asset.delete', resourceType: 'asset' },
    { method: 'POST', pattern: /^\/api\/logs\/?$/, action: 'log.create', resourceType: 'log' },
    { method: 'PUT', pattern: /^\/api\/logs\/([a-f\d]{24})\/?$/i, action: 'log.update', resourceType: 'log' },
    { method: 'GET', pattern: /^\/api\/audit\/?$/, action: 'audit.read', resourceType: 'audit' },
];

export const matchAuditedRoute = (method: string, pathname: string) => {
    for (const route of routes) {
        if (route.method !== method) continue;
        const match = route.pattern.exec(pathname);
        if (match) {
            return {
                action: route.action, resourceType: route.resourceType,
                pathResourceId: match[1]?.toLowerCase(),
            };
        }
    }
    return null;
};

export const auditOutcome = (status: number): AuditOutcome =>
    status < 400 ? 'success' : status === 401 || status === 403
        ? 'denied' : 'failed';
