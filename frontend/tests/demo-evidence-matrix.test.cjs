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
    const m = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(key => {
        if (!/^\.\/[a-z-]+$/.test(key)) throw new Error('Unexpected evidence import');
        return load(key.slice(2) + '.ts');
    }, m, m.exports);
    cache.set(name, m.exports);
    return m.exports;
}
const { buildEvidenceMatrix, buildEvidenceMatrixProbes } = load('evidence-matrix.ts');
const { assessDemoDataQuality } = load('quality.ts');
const { assessLifecycleTraceability } = load('traceability.ts');
const clone = value => JSON.parse(JSON.stringify(value));
const categories = result => result.cells.map(cell =>
    `${cell.qualityEligible ? 'eligible' : 'excluded'}:${cell.history}:${cell.rows}`);

test('baseline divides twelve fictional rows across six mutually exclusive cells', () => {
    const original = JSON.stringify(fixture);
    const report = buildEvidenceMatrix(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.equal(report.assessedRows, 12);
    assert.equal(report.eligibleRows, 12);
    assert.equal(report.excludedRows, 0);
    assert.equal(report.recordedAndVerifiedRows, 3);
    assert.equal(report.unrecordedHistoryRows, 9);
    assert.equal(report.invalidHistoryRows, 0);
    assert.deepEqual(categories(report), [
        'eligible:verified:3', 'eligible:unrecorded:9', 'eligible:invalid:0',
        'excluded:verified:0', 'excluded:unrecorded:0', 'excluded:invalid:0',
    ]);
    assert.deepEqual(report.rowAssessments.map(row => row.ordinal),
        Array.from({ length: 12 }, (_, i) => i + 1));
    assert.equal(JSON.stringify(fixture), original);
    assert.ok(!JSON.stringify(report).includes('Fictional demo operator'),
        'output must contain only numeric row positions, not actor names');
});

test('six independently reconstructed fake cases cover every cell once', () => {
    const before = JSON.stringify(fixture);
    const report = buildEvidenceMatrixProbes(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.equal(report.assessedRows, 6);
    assert.equal(report.eligibleRows, 3);
    assert.equal(report.excludedRows, 3);
    assert.ok(report.cells.every(cell => cell.rows === 1));
    assert.deepEqual(report.rowAssessments.map(row => row.history),
        ['verified', 'unrecorded', 'invalid', 'verified', 'unrecorded', 'invalid']);
    assert.deepEqual(report.rowAssessments.map(row => row.qualityEligible),
        [true, true, true, false, false, false]);
    assert.ok(report.rowAssessments.slice(3).every(row => row.qualityCodes.includes('UNLINKED')));
    assert.deepEqual(report.rowAssessments[2].historyCodes, ['INVALID_TRANSITION']);
    assert.equal(JSON.stringify(fixture), before);
});

test('duplicate IDs exclude BOTH rows even though aggregate duplicate counter is one', () => {
    const a = clone(fixture.logs.find(row => row.id === 'L007'));
    const b = clone(a);
    b.statusHistory = [];
    const input = [a, b];
    const q = assessDemoDataQuality(fixture.assets, input, fixture.context.snapshot);
    const h = assessLifecycleTraceability(input, fixture.context.snapshot);
    const report = buildEvidenceMatrix(fixture.assets, input, fixture.context.snapshot);
    assert.equal(q.duplicateLogIds, 1, 'dataset duplicate counter is excess copies');
    assert.deepEqual(q.eligibleRecordIndices, []);
    assert.deepEqual(q.rowAssessments.map(row => row.codes), [
        ['DUPLICATE_LOGS'], ['DUPLICATE_LOGS'],
    ]);
    assert.deepEqual(h.rowAssessments.map(row => row.classification),
        ['verified', 'unrecorded']);
    assert.deepEqual(categories(report), [
        'eligible:verified:0', 'eligible:unrecorded:0', 'eligible:invalid:0',
        'excluded:verified:1', 'excluded:unrecorded:1', 'excluded:invalid:0',
    ]);
});

test('repeated asset identifiers exclude each referencing row without changing provenance', () => {
    const assets = [...clone(fixture.assets), clone(fixture.assets[0])];
    const quality = assessDemoDataQuality(assets, fixture.logs, fixture.context.snapshot);
    assert.equal(quality.duplicateAssets, 1);
    const matrix = buildEvidenceMatrix(assets, fixture.logs, fixture.context.snapshot);
    const affected = matrix.rowAssessments.filter(row =>
        row.qualityCodes.includes('DUPLICATE_ASSETS'));
    assert.ok(affected.length >= 1);
    assert.ok(affected.every(row => !row.qualityEligible));
    assert.equal(quality.eligibleRecords, matrix.eligibleRows);
    assert.equal(matrix.cells.reduce((sum, cell) => sum + cell.rows, 0), 12);
});

test('overlapping row defects are attributed without treating them as unique excluded rows', () => {
    const broken = clone(fixture.logs.find(row => row.id === 'L007'));
    broken.id = ' ';
    broken.assetId = '__MATRIX_ORPHAN__';
    broken.statusHistory[1].from = 'resolved';
    const report = buildEvidenceMatrix(fixture.assets, [broken], fixture.context.snapshot);
    assert.equal(report.assessedRows, 1);
    assert.equal(report.excludedRows, 1);
    assert.equal(report.invalidHistoryRows, 1);
    assert.deepEqual(report.rowAssessments[0].qualityCodes,
        ['UNLINKED', 'MISSING_LOG_ID']);
    assert.deepEqual(report.rowAssessments[0].historyCodes, ['INVALID_TRANSITION']);
    assert.equal(report.cells.find(cell => !cell.qualityEligible && cell.history === 'invalid').rows, 1);
    assert.equal(report.rowAssessments[0].ordinal, 1);
    assert.deepEqual(Object.keys(report.rowAssessments[0]), [
        'ordinal', 'qualityEligible', 'history', 'qualityCodes', 'historyCodes',
    ]);
});

test('empty and invalid-reference populations fail or reconcile explicitly', () => {
    const empty = buildEvidenceMatrix(fixture.assets, [], fixture.context.snapshot);
    assert.equal(empty.assessedRows, 0);
    assert.equal(empty.rowAssessments.length, 0);
    assert.ok(empty.cells.every(cell => cell.rows === 0));
    assert.throws(() => buildEvidenceMatrixProbes(
        fixture.assets, [], fixture.context.snapshot), /verified fictional L007/);
    assert.throws(() => buildEvidenceMatrix(
        fixture.assets, fixture.logs, '2026-02-30'), /Invalid/);
});
