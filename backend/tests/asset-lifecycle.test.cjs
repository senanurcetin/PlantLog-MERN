const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAssetStatusTransition } = require('../dist/utils/assetLifecycle.js');

test('new and restored equipment may enter maintenance', () => {
    assert.equal(validateAssetStatusTransition('operational', 'maintenance'), true);
    assert.equal(validateAssetStatusTransition('maintenance', 'operational'), true);
    assert.equal(validateAssetStatusTransition('maintenance', 'decommissioned'), true);
    assert.equal(validateAssetStatusTransition('operational', 'decommissioned'), true);
});

test('identical statuses do not append duplicate history entries', () => {
    assert.equal(validateAssetStatusTransition('operational', 'operational'), false);
    assert.equal(validateAssetStatusTransition('maintenance', 'maintenance'), false);
    assert.equal(validateAssetStatusTransition('decommissioned', 'decommissioned'), false);
});

test('decommissioning is terminal and invalid statuses are rejected', () => {
    assert.throws(() => validateAssetStatusTransition('decommissioned', 'operational'),
        /Invalid asset status transition/);
    assert.throws(() => validateAssetStatusTransition('decommissioned', 'maintenance'),
        /Invalid asset status transition/);
    assert.throws(() => validateAssetStatusTransition('operational', 'unexpected'),
        /Invalid asset status transition/);
});
