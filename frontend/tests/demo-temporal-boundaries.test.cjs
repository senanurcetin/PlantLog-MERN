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
    const js = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const moduleObject = { exports: {} };
    new Function('require', 'module', 'exports', js)(key => {
        if (!/^\.\/[a-z-]+$/.test(key)) throw new Error('Unexpected temporal lab import');
        return load(key.slice(2) + '.ts');
    }, moduleObject, moduleObject.exports);
    cache.set(name, moduleObject.exports);
    return moduleObject.exports;
}
const { buildTemporalBoundaryExperiments } = load('temporal-boundaries.ts');

test('all twelve UTC boundary examples match their declared independent contracts', () => {
    const before = JSON.stringify(fixture);
    const cases = buildTemporalBoundaryExperiments(fixture.assets);
    assert.equal(cases.length, 12);
    assert.deepEqual(cases.map(row => row.id), [
        'ordinary', 'final-millisecond', 'post-snapshot-transition',
        'reversed-time', 'leap-day', 'non-leap-day', 'offset-opening',
        'local-event', 'year-boundary', 'future-opening', 'unrecorded',
        'equal-transition-time',
    ]);
    assert.deepEqual(cases.filter(row => !row.matchesExpected).map(row => row.id), []);
    assert.deepEqual(cases.map(row => row.observed.classification), [
        'verified', 'verified', 'invalid', 'invalid', 'verified',
        'invalid', 'invalid', 'invalid', 'verified', 'invalid',
        'unrecorded', 'verified',
    ]);
    assert.deepEqual(cases.map(row => row.observed.eligible), [
        true, true, true, true, true, false, false, true, true,
        false, true, true,
    ]);
    assert.equal(JSON.stringify(fixture), before,
        'fixture must remain byte-equivalent after all experimental cases');
});

test('a valid base row can still have an unverified or contradictory event history', () => {
    const cases = buildTemporalBoundaryExperiments(fixture.assets);
    const byId = Object.fromEntries(cases.map(row => [row.id, row]));
    assert.equal(byId['post-snapshot-transition'].observed.eligible, true);
    assert.deepEqual(byId['post-snapshot-transition'].observed.issueCodes, ['AFTER_SNAPSHOT']);
    assert.equal(byId['reversed-time'].observed.eligible, true);
    assert.deepEqual(byId['reversed-time'].observed.issueCodes, ['NON_MONOTONIC_TIME']);
    assert.equal(byId['local-event'].observed.eligible, true);
    assert.deepEqual(byId['local-event'].observed.issueCodes, ['INVALID_EVENT_TIMESTAMP']);
    assert.equal(byId.unrecorded.observed.eligible, true);
    assert.deepEqual(byId.unrecorded.observed.issueCodes, ['MISSING_HISTORY']);
    assert.deepEqual(byId['non-leap-day'].observed.issueCodes,
        ['INVALID_EVENT_TIMESTAMP', 'INVALID_OPEN_EVENT']);
    assert.equal(byId['final-millisecond'].observed.classification, 'verified');
    assert.equal(byId['equal-transition-time'].observed.classification, 'verified');
});

test('temporal lab rejects a missing or retired fictional reference asset', () => {
    assert.throws(() => buildTemporalBoundaryExperiments([]), /in-service fictional A01/);
    const retired = fixture.assets.map(item => item.id === 'A01'
        ? { ...item, status: 'decommissioned' } : item);
    assert.throws(() => buildTemporalBoundaryExperiments(retired), /in-service fictional A01/);
});
