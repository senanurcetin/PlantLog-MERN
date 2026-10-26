const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const fixture = require('../src/demo/fixture.json');

const cache = new Map();
function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = readFileSync(path.resolve(__dirname, '../src/demo', name), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const moduleObject = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(key => {
        if (!/^\.\/[a-z-]+$/.test(key)) throw new Error('Unexpected model import');
        return load(key.slice(2) + '.ts');
    }, moduleObject, moduleObject.exports);
    cache.set(name, moduleObject.exports);
    return moduleObject.exports;
}
const { runScenarioModelCheck } = load('model-check.ts');
const { buildLifecycleFaultExperiments } = load('traceability-experiments.ts');

test('exhaustive six-step reference model rejects illegal actions and proves in-memory invariants', () => {
    const untouched = JSON.stringify(fixture);
    const result = runScenarioModelCheck(fixture.assets, fixture.context.snapshot);
    assert.equal(result.actionAlphabet, 5);
    assert.equal(result.maximumSequenceLength, 6);
    assert.equal(result.exploredPrefixes, 19531);
    assert.deepEqual(result.distinctPhases,
        ['idle', 'open', 'acknowledged', 'in_progress', 'resolved']);
    assert.ok(result.acceptedActions > 0);
    assert.ok(result.rejectedActions > 0);
    assert.ok(result.resetActions > 0);
    assert.ok(result.checkedScenarioRecords > 0);
    assert.ok(result.idlePrefixes > 0);
    assert.equal(result.acceptedActions + result.rejectedActions + result.resetActions,
        result.exploredPrefixes - 1);
    assert.equal(result.checkedScenarioRecords + result.idlePrefixes,
        result.exploredPrefixes);
    assert.equal(JSON.stringify(fixture), untouched, 'model test must never change the source');
});

test('eleven independently reconstructed fault experiments identify every diagnostic class', () => {
    const untouched = JSON.stringify(fixture);
    const result = buildLifecycleFaultExperiments(
        fixture.assets, fixture.logs, fixture.context.snapshot,
    );
    assert.equal(result.length, 11);
    assert.deepEqual(result.map(row => row.id), [
        'baseline', 'unrecorded', 'shape', 'opening', 'transition',
        'timestamp', 'ordering', 'future', 'actor', 'final', 'overlap',
    ]);
    assert.deepEqual(result.map(row => row.classification), [
        'verified', 'unrecorded', 'invalid', 'invalid', 'invalid',
        'invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid',
    ]);
    const unique = new Set(result.flatMap(row => row.issues.map(issue => issue.code)));
    assert.deepEqual([...unique].sort(), [
        'AFTER_SNAPSHOT', 'FINAL_STATE_MISMATCH', 'INVALID_EVENT_TIMESTAMP',
        'INVALID_HISTORY_SHAPE', 'INVALID_OPEN_EVENT', 'INVALID_TRANSITION',
        'MISSING_ACTOR', 'MISSING_HISTORY', 'NON_MONOTONIC_TIME',
    ].sort());
    assert.ok(result.every(row => row.eligibleByIndependentQualityGates === 1),
        'history-only defects may not silently alter the eight quality gates');
    assert.equal(result[0].issues.length, 0);
    assert.deepEqual(result[1].issues, [{ code: 'MISSING_HISTORY', count: 1 }]);
    assert.equal(result.at(-1).issues.length, 4);
    assert.equal(result.at(-1).issues.every(issue => issue.count === 1), true);
    assert.equal(JSON.stringify(fixture), untouched, 'fault lab must not change the fixture');
});

test('fault experiments fail explicitly if the expected reference example is absent', () => {
    assert.throws(() => buildLifecycleFaultExperiments(
        fixture.assets, fixture.logs.filter(log => log.id !== 'L007'),
        fixture.context.snapshot,
    ), /reference timeline/);
    assert.throws(() => runScenarioModelCheck(
        fixture.assets.filter(asset => asset.id !== 'A03'), fixture.context.snapshot,
    ), /in-service A03/);
});
