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
    new Function('require', 'module', 'exports', js)(dependency => {
        if (!/^\.\/[^/]+$/.test(dependency)) throw new Error('Unexpected dependency');
        return load(dependency.slice(2) + '.ts');
    }, moduleObject, moduleObject.exports);
    cache.set(name, moduleObject.exports);
    return moduleObject.exports;
}
const { assessLifecycleTraceability } = load('traceability.ts');
const snapshot = fixture.context.snapshot;
const codes = report => Object.fromEntries(report.issues.map(item => [item.code, item.count]));
const clone = value => JSON.parse(JSON.stringify(value));

test('baseline reports only documented histories; missing data is not invented', () => {
    const before = JSON.stringify(fixture);
    const report = assessLifecycleTraceability(fixture.logs, snapshot);
    assert.equal(report.assessedRecords, 12);
    assert.equal(report.verifiedHistory, 3);
    assert.equal(report.missingHistory, 9);
    assert.equal(report.invalidHistory, 0);
    assert.equal(report.observedHistoryEvents, 7);
    assert.deepEqual(report.issues.length, 9);
    assert.equal(codes(report).MISSING_HISTORY, 9);
    assert.equal(report.issues.filter(issue => issue.count > 0).length, 1);
    assert.match(report.caveat, /not invented/);
    assert.equal(JSON.stringify(fixture), before, 'analysis must not modify the fixture');
});

test('single-step resolution is permitted; events do not require every intermediate phase', () => {
    const log = {
        id: 'X', assetId: 'A01', type: 'incident', status: 'resolved',
        date: '2026-10-18T08:00:00Z',
        statusHistory: [
            { from: null, to: 'open', changedAt: '2026-10-18T08:00:00Z', changedBy: 'Demo operator' },
            { from: 'open', to: 'resolved', changedAt: '2026-10-18T09:00:00Z', changedBy: 'Demo supervisor' },
        ],
    };
    assert.equal(assessLifecycleTraceability([log], snapshot).verifiedHistory, 1);
});

test('broken transition and final-state contradiction cannot pass evidence checks', () => {
    const broken = clone(fixture.logs.find(item => item.id === 'L007'));
    broken.statusHistory[2].from = 'open';
    broken.status = 'acknowledged';
    const result = assessLifecycleTraceability([broken], snapshot);
    assert.equal(result.invalidHistory, 1);
    assert.equal(result.verifiedHistory, 0);
    assert.equal(codes(result).INVALID_TRANSITION, 1);
    assert.equal(codes(result).FINAL_STATE_MISMATCH, 1);
});

test('invalid time, backwards event and post-snapshot records are diagnosed separately', () => {
    const a = clone(fixture.logs.find(item => item.id === 'L007'));
    a.statusHistory[1].changedAt = '2026-02-30T12:00:00Z';
    const b = clone(fixture.logs.find(item => item.id === 'L007'));
    b.statusHistory[2].changedAt = '2026-10-15T10:00:00Z';
    const c = clone(fixture.logs.find(item => item.id === 'L007'));
    c.statusHistory[3].changedAt = '2026-10-19T00:00:00Z';
    const result = assessLifecycleTraceability([a,b,c], snapshot);
    assert.equal(result.invalidHistory, 3);
    assert.equal(codes(result).INVALID_EVENT_TIMESTAMP, 1);
    assert.equal(codes(result).NON_MONOTONIC_TIME, 1);
    assert.equal(codes(result).AFTER_SNAPSHOT, 1);
});

test('missing opening provenance, missing actor and malformed structure are fail-closed', () => {
    const a = clone(fixture.logs.find(item => item.id === 'L012'));
    a.statusHistory[0].from = 'resolved';
    const b = clone(fixture.logs.find(item => item.id === 'L012'));
    b.statusHistory[0].changedBy = ' ';
    const c = { ...clone(b), id: 'non-array', statusHistory: 'not an event array' };
    const d = { ...clone(b), id: 'non-object', statusHistory: [null] };
    const e = { ...clone(b), id: 'none', statusHistory: undefined };
    const report = assessLifecycleTraceability([a,b,c,d,e], snapshot);
    assert.equal(report.verifiedHistory, 0);
    assert.equal(report.missingHistory, 1);
    assert.equal(report.invalidHistory, 4);
    assert.equal(codes(report).INVALID_OPEN_EVENT, 1);
    assert.equal(codes(report).MISSING_ACTOR, 1);
    assert.equal(codes(report).INVALID_HISTORY_SHAPE, 2);
    assert.equal(codes(report).MISSING_HISTORY, 1);
});

test('prototype-looking states never execute inherited object properties', () => {
    const bad = clone(fixture.logs.find(item => item.id === 'L007'));
    bad.statusHistory[1].to = '__proto__';
    bad.statusHistory[2].from = '__proto__';
    const result = assessLifecycleTraceability([bad], snapshot);
    assert.equal(result.invalidHistory, 1);
    assert.equal(codes(result).INVALID_TRANSITION, 1);
});

test('empty population remains empty and invalid snapshot fails loudly', () => {
    const result = assessLifecycleTraceability([], snapshot);
    assert.equal(result.assessedRecords, 0);
    assert.equal(result.verifiedHistory + result.missingHistory + result.invalidHistory, 0);
    assert.throws(() => assessLifecycleTraceability([], '2026-02-30'));
});
