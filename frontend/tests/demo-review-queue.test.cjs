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
        if (!/^\.\/[a-z-]+$/.test(key)) throw Error('Unexpected synthetic import');
        return load(key.slice(2) + '.ts');
    }, moduleObject, moduleObject.exports);
    cache.set(name, moduleObject.exports);
    return moduleObject.exports;
}
const { buildEvidenceMatrix, buildEvidenceMatrixProbes } = load('evidence-matrix.ts');
const { buildSyntheticReviewQueue } = load('review-queue.ts');
const clone = v => JSON.parse(JSON.stringify(v));
const snapshot = fixture.context.snapshot;
const run = logs => buildSyntheticReviewQueue(
    buildEvidenceMatrix(fixture.assets, logs, snapshot));

test('twelve fictional records are partitioned without inventing provenance', () => {
    const original = JSON.stringify(fixture);
    const report = run(fixture.logs);
    assert.equal(report.assessedRows, 12);
    assert.equal(report.requiresSourceReview, 9);
    assert.equal(report.recordedConsistentRows, 3);
    assert.deepEqual(report.categories.map(item => [item.id, item.rows]), [
        ['basic-data', 0],
        ['history-conflict', 0],
        ['history-unrecorded', 9],
        ['recorded-consistent', 3],
    ]);
    assert.deepEqual(report.rows.map(row => row.ordinal).sort((a, b) => a - b),
        Array.from({ length: 12 }, (_, i) => i + 1));
    assert.equal(report.rows.filter(row => row.history === 'unrecorded')
        .every(row => row.historyCodes.includes('MISSING_HISTORY')), true);
    assert.equal(JSON.stringify(fixture), original);
});

test('six controlled matrix cells become four mutually exclusive review groups', () => {
    const matrix = buildEvidenceMatrixProbes(fixture.assets, fixture.logs, snapshot);
    const report = buildSyntheticReviewQueue(matrix);
    assert.deepEqual(report.categories.map(item => item.rows), [3, 1, 1, 1]);
    assert.deepEqual(report.rows.map(item => item.ordinal), [4, 5, 6, 3, 2, 1]);
    assert.deepEqual(report.rows.slice(0, 3).map(row => row.history),
        ['verified', 'unrecorded', 'invalid']);
    assert.deepEqual(report.rows[2].qualityCodes, ['UNLINKED']);
    assert.deepEqual(report.rows[2].historyCodes, ['INVALID_TRANSITION']);
    assert.equal(report.requiresSourceReview, 5);
    assert.equal(report.recordedConsistentRows, 1);
});

test('overlap keeps both defect families without double-counting the same row', () => {
    const log = clone(fixture.logs.find(row => row.id === 'L007'));
    log.assetId = '__NOT_AN_ASSET__';
    log.id = '';
    log.statusHistory[1].from = 'resolved';
    const report = run([log]);
    assert.deepEqual(report.categories.map(item => item.rows), [1, 0, 0, 0]);
    assert.equal(report.requiresSourceReview, 1);
    assert.deepEqual(report.rows[0].qualityCodes, ['UNLINKED', 'MISSING_LOG_ID']);
    assert.deepEqual(report.rows[0].historyCodes, ['INVALID_TRANSITION']);
    assert.equal(report.rows[0].category, 'basic-data');
    assert.match(report.caveat, /not plant safety priority/);
});

test('row permutation retains categorical totals but not source positions', () => {
    const baseline = run(fixture.logs);
    const reordered = run([...fixture.logs].reverse());
    assert.deepEqual(reordered.categories, baseline.categories);
    assert.equal(reordered.requiresSourceReview, baseline.requiresSourceReview);
    assert.equal(reordered.rows.length, baseline.rows.length);
    assert.equal(new Set(reordered.rows.map(row => row.ordinal)).size, 12);
});

test('temporary in-memory incident updates totals without mutating input data', () => {
    const original = JSON.stringify(fixture);
    const transient = {
        id: 'SIM-REVIEW-001', assetId: 'A01', type: 'incident',
        status: 'open', date: snapshot + 'T12:00:00.000Z',
        statusHistory: [
            { from: null, to: 'open', changedAt: snapshot + 'T12:00:00.000Z',
                changedBy: 'Fictional operator' },
        ],
    };
    const report = run([...fixture.logs, transient]);
    assert.equal(report.assessedRows, 13);
    assert.equal(report.requiresSourceReview, 9);
    assert.equal(report.recordedConsistentRows, 4);
    assert.equal(JSON.stringify(fixture), original);
});

test('empty input is valid, forged or ambiguous matrix entries fail closed', () => {
    const empty = run([]);
    assert.equal(empty.assessedRows, 0);
    assert.deepEqual(empty.categories.map(item => item.rows), [0, 0, 0, 0]);
    const proper = buildEvidenceMatrix(fixture.assets, fixture.logs, snapshot);
    const wrongCount = clone(proper);
    wrongCount.excludedRows++;
    assert.throws(() => buildSyntheticReviewQueue(wrongCount), /differ from the independent evidence matrix/);
    const repeatedPosition = clone(proper);
    repeatedPosition.rowAssessments[1].ordinal = repeatedPosition.rowAssessments[0].ordinal;
    assert.throws(() => buildSyntheticReviewQueue(repeatedPosition), /repeated synthetic review row/);
    const conflictingReasons = clone(proper);
    conflictingReasons.rowAssessments[0].qualityCodes.push('UNLINKED');
    assert.throws(() => buildSyntheticReviewQueue(conflictingReasons), /repeated synthetic review row/);
});
