const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const fixture = require('../src/demo/fixture.json');

const load = (file, overrides = {}) => {
    const source = fs.readFileSync(path.resolve(__dirname, '../src/demo', file), 'utf8');
    const js = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', js)(
        key => overrides[key] || require(key), mod, mod.exports);
    return mod.exports;
};
const insights = load('insights.ts');
const quality = load('quality.ts');
const { buildEligibilitySensitivity } = load('sensitivity.ts', {
    './insights': insights,
    './quality': quality,
});
const sourceFixture = JSON.stringify(fixture);

test('scientific sensitivity baseline reconciles raw and eligible denominators exactly', () => {
    const result = buildEligibilitySensitivity(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.deepEqual(result.map(x => x.id),
        ['baseline', 'orphan', 'date', 'duplicate', 'overlap']);
    const baseline = result[0];
    assert.equal(baseline.assessed, 12);
    assert.equal(baseline.eligible, 12);
    assert.equal(baseline.excluded, 0);
    assert.equal(baseline.rawOpenCases, 4);
    assert.equal(baseline.eligibleOpenCases, 4);
    assert.deepEqual(baseline.findings, []);
});

test('one invalid asset reference excludes one event, without hiding raw backlog', () => {
    const r = buildEligibilitySensitivity(fixture.assets, fixture.logs, fixture.context.snapshot)[1];
    assert.equal(r.assessed, 12);
    assert.equal(r.eligible, 11);
    assert.equal(r.excluded, 1);
    assert.equal(r.rawOpenCases, 4);
    assert.equal(r.eligibleOpenCases, 3);
    assert.equal(r.rawUnlinkedCases, 1);
    assert.equal(r.eligibleUnlinkedCases, 0);
    assert.deepEqual(r.findings.map(x => x.code), ['UNLINKED']);
});

test('invalid UTC dates are excluded; duplicate IDs exclude BOTH ambiguous rows', () => {
    const r = buildEligibilitySensitivity(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.equal(r[2].eligible, 11);
    assert.equal(r[2].eligibleOpenCases, 3);
    assert.deepEqual(r[2].findings.map(x => x.code), ['INVALID_DATE']);
    assert.equal(r[3].eligible, 10);
    assert.equal(r[3].eligibleOpenCases, 2);
    assert.equal(r[3].excluded, 2);
    assert.equal(r[3].findings.find(x => x.code === 'DUPLICATE_LOGS').count, 1);
});

test('overlapping violations count each excluded row only once, never mutate the source', () => {
    const r = buildEligibilitySensitivity(fixture.assets, fixture.logs, fixture.context.snapshot)[4];
    assert.equal(r.eligible, 11);
    assert.equal(r.excluded, 1);
    assert.equal(r.findings.reduce((n, finding) => n + finding.count, 0), 3);
    assert.equal(r.eligibleOpenCases, 3);
    assert.equal(JSON.stringify(fixture), sourceFixture);
    const rechecked = buildEligibilitySensitivity(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.deepEqual(r, rechecked[4], 'experiment is reproducible without a real clock or RNG');
});

test('reject datasets with insufficient or invalid baseline instead of inventing results', () => {
    assert.throws(
        () => buildEligibilitySensitivity(fixture.assets, fixture.logs.slice(0, 1), fixture.context.snapshot),
        /at least two eligible/,
    );
    assert.throws(
        () => buildEligibilitySensitivity(fixture.assets,
            [{ ...fixture.logs[0], id: '' }, ...fixture.logs.slice(1)],
            fixture.context.snapshot),
        /at least two eligible/,
    );
});
