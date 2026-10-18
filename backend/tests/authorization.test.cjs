const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canManageAssets, canEditLog } = require('../dist/utils/authorization.js');

test('asset management is reserved for supervisors and administrators', () => {
    assert.equal(canManageAssets('admin'), true);
    assert.equal(canManageAssets('supervisor'), true);
    assert.equal(canManageAssets('operator'), false);
    assert.equal(canManageAssets(undefined), false);
});

test('operators may only edit their own logs', () => {
    assert.equal(canEditLog('operator', 'alice', 'alice'), true);
    assert.equal(canEditLog('operator', 'alice', 'bob'), false);
    assert.equal(canEditLog('operator', 'alice', undefined), false);
});

test('supervisors and admins may update other authors logs', () => {
    for (const role of ['supervisor', 'admin']) {
        assert.equal(canEditLog(role, 'alice', 'bob'), true);
    }
    assert.equal(canEditLog(undefined, 'alice', 'alice'), false);
});
