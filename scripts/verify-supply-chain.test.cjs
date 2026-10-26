const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyLockfile, validateAudit } = require('./verify-supply-chain.cjs');

test('both lockfiles use only canonical npm registry with sha512-integrity and exact manifest roots', () => {
    const a = verifyLockfile('backend');
    const b = verifyLockfile('frontend');
    assert.ok(a.totalLockedPackages > 100);
    assert.ok(b.totalLockedPackages > 200);
    assert.equal(a.registry, 'https://registry.npmjs.org/');
    assert.equal(b.registry, 'https://registry.npmjs.org/');
    assert.equal(a.verifiedSha512, true);
    assert.equal(b.verifiedSha512, true);
    assert.match(a.lockfileSha256, /^[a-f0-9]{64}$/);
    assert.match(b.lockfileSha256, /^[a-f0-9]{64}$/);
});

test('source and project inputs must be restricted', () => {
    assert.throws(() => verifyLockfile('../'), /Unsupported project/);
    assert.throws(() => verifyLockfile('private-root'), /Unsupported project/);
});

test('audit without advisory metadata fails closed; HIGH+ is explicitly counted', () => {
    for (const payload of [{}, null, { error: { code: 'EAUDITNETWORK' } },
        { metadata: { vulnerabilities: { high: -1 } } }]) {
        assert.throws(() => validateAudit(payload, 'synthetic-test'));
    }
    const checked = validateAudit({
        metadata: { vulnerabilities: {
            info: 0, low: 3, moderate: 2, high: 1, critical: 1,
        } },
        vulnerabilities: { packageA: { severity: 'high' },
            packageB: { severity: 'critical' } },
    }, 'synthetic-test');
    assert.equal(checked.highOrCritical, 2);
    assert.equal(checked.vulnerabilityCounts.moderate, 2);
    assert.deepEqual(checked.affectedPackageNames, ['packageA', 'packageB']);
});
