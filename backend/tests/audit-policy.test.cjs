const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { matchAuditedRoute, auditOutcome } = require('../dist/utils/auditPolicy.js');
const AuditEvent = require('../dist/models/AuditEvent.js').default;

test('audit policy whitelists fixed routes, not user payloads or query strings', () => {
    assert.deepEqual(matchAuditedRoute('POST', '/api/auth/login'), {
        action: 'auth.login', resourceType: 'auth', pathResourceId: undefined,
    });
    assert.deepEqual(matchAuditedRoute('PUT', '/api/assets/507F1F77BCF86CD799439011'), {
        action: 'asset.update', resourceType: 'asset',
        pathResourceId: '507f1f77bcf86cd799439011',
    });
    assert.equal(matchAuditedRoute('GET', '/api/assets'), null);
    assert.equal(matchAuditedRoute('POST', '/api/auth/me'), null);
    assert.equal(matchAuditedRoute('PUT', '/api/assets/$where'), null);
    assert.equal(matchAuditedRoute('POST', '/api/private-secret'), null);
    assert.equal(matchAuditedRoute('POST', '/api/auth/login?password=secret'), null,
        'policy must be applied to normalized pathname, never raw URL');
    assert.deepEqual([200, 201, 204, 400, 401, 403, 409, 500].map(auditOutcome),
        ['success','success','success','failed','denied','denied','failed','failed']);
});

test('pre-production ledger uses bounded immutable metadata and 30 day expiration', () => {
    const fields = Object.keys(AuditEvent.schema.paths);
    for (const forbidden of ['email','password','body','token','authorization',
        'ip','userAgent','headers','description','payload']) {
        assert.equal(fields.includes(forbidden), false, forbidden + ' must not be in schema');
    }
    const expire = AuditEvent.schema.indexes().find(([keys]) => keys.occurredAt === 1);
    assert.equal(expire[1].expireAfterSeconds, 30 * 86400);
    for (const key of ['action','statusCode','outcome','resourceType']) {
        assert.equal(AuditEvent.schema.path(key).options.immutable, true);
    }
    const app = readFileSync(path.resolve(__dirname, '../src/app.ts'), 'utf8');
    assert.match(app, /app\.use\(captureAuditTrail\)/);
});
