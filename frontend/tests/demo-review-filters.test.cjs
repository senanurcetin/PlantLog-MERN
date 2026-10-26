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
    const outputText = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', outputText)(dependency => {
        if (!/^\.\/[a-z-]+$/.test(dependency)) throw Error('Unexpected import');
        return load(dependency.slice(2) + '.ts');
    }, mod, mod.exports);
    cache.set(name, mod.exports);
    return mod.exports;
}
const { buildEvidenceMatrix, buildEvidenceMatrixProbes } = load('evidence-matrix.ts');
const { buildSyntheticReviewQueue } = load('review-queue.ts');
const { buildReviewDiagnosticFacets, filterSyntheticReview,
    ALL_REVIEW_FILTERS } = load('review-filters.ts');

const baseline = () => buildSyntheticReviewQueue(buildEvidenceMatrix(
    fixture.assets, fixture.logs, fixture.context.snapshot));
const probes = () => buildSyntheticReviewQueue(buildEvidenceMatrixProbes(
    fixture.assets, fixture.logs, fixture.context.snapshot));
const query = (report, changes = {}) => filterSyntheticReview(report, {
    ...ALL_REVIEW_FILTERS, ...changes,
});

test('baseline has nine unique unrecorded-history rows; empty and default filters reconcile', () => {
    const before = JSON.stringify(fixture);
    const report = baseline();
    assert.deepEqual(buildReviewDiagnosticFacets(report), [
        { code: 'MISSING_HISTORY', axis: 'history', rows: 9 },
    ]);
    assert.equal(query(report).matched, 12);
    assert.deepEqual(query(report, { diagnostic: 'MISSING_HISTORY' })
        .matchedRows.map(row => row.ordinal).sort((a, b) => a - b),
        report.rows.filter(row => row.history === 'unrecorded')
            .map(row => row.ordinal).sort((a, b) => a - b));
    assert.equal(query(report, { history: 'verified' }).matched, 3);
    assert.equal(query(report, { category: 'history-unrecorded' }).matched, 9);
    assert.equal(query(report, { history: 'invalid' }).matched, 0);
    assert.equal(JSON.stringify(fixture), before);
});

test('six controlled cases show independent overlapping diagnostic facets', () => {
    const report = probes();
    assert.deepEqual(buildReviewDiagnosticFacets(report), [
        { code: 'UNLINKED', axis: 'basic-data', rows: 3 },
        { code: 'INVALID_TRANSITION', axis: 'history', rows: 2 },
        { code: 'MISSING_HISTORY', axis: 'history', rows: 2 },
    ]);
    assert.equal(query(report).matched, 6);
    assert.equal(query(report, { category: 'basic-data' }).matched, 3);
    assert.equal(query(report, { history: 'invalid' }).matched, 2);
    assert.equal(query(report, { diagnostic: 'INVALID_TRANSITION' }).matched, 2);
    assert.deepEqual(query(report, {
        category: 'basic-data', history: 'invalid', diagnostic: 'INVALID_TRANSITION',
    }).matchedRows.map(row => row.ordinal), [6]);
    assert.deepEqual(query(report, {
        category: 'basic-data', history: 'unrecorded', diagnostic: 'MISSING_HISTORY',
    }).matchedRows.map(row => row.ordinal), [5]);
    assert.deepEqual(query(report, {
        category: 'basic-data', diagnostic: 'MISSING_HISTORY',
    }).matchedRows.map(row => row.ordinal), [5]);
    assert.equal(query(report, {
        category: 'history-conflict', diagnostic: 'UNLINKED',
    }).matched, 0);
    assert.equal(query(report, {
        history: 'verified', diagnostic: 'UNLINKED',
    }).matched, 1);
});

test('intersection queries cannot change original categories, codes or row ordering', () => {
    const report = probes();
    const before = JSON.stringify(report);
    for (const category of ['all', ...report.categories.map(row => row.id)]) {
        const filtered = query(report, { category });
        assert.equal(filtered.matched, filtered.matchedRows.length);
        assert.equal(filtered.assessed, 6);
        assert.ok(filtered.matchedRows.every(row =>
            category === 'all' || row.category === category));
    }
    const rowsAcrossCategories = report.categories.reduce((sum, category) =>
        sum + query(report, { category: category.id }).matched, 0);
    assert.equal(rowsAcrossCategories, 6, 'exclusive categories partition each row once');
    assert.equal(JSON.stringify(report), before);
});

test('unknown category, history or diagnostic fails explicitly', () => {
    const report = probes();
    assert.throws(() => query(report, { category: 'unknown' }), /Unknown synthetic/);
    assert.throws(() => query(report, { history: 'unverified' }), /Unknown synthetic/);
    assert.throws(() => query(report, { diagnostic: '__proto__' }), /Unknown synthetic/);
    assert.throws(() => query(report, { diagnostic: 'MISSING_ACTOR' }), /Unknown synthetic/);
});

test('empty matrix has no phantom diagnostics; scenario adds a verified row only', () => {
    const empty = buildSyntheticReviewQueue(buildEvidenceMatrix(
        fixture.assets, [], fixture.context.snapshot));
    assert.deepEqual(buildReviewDiagnosticFacets(empty), []);
    assert.equal(query(empty).matched, 0);
    assert.equal(query(empty).assessed, 0);

    const synthetic = {
        id: 'SIM-FACET-001', assetId: 'A01', type: 'maintenance',
        status: 'open', date: fixture.context.snapshot + 'T12:00:00.000Z',
        statusHistory: [{
            from: null, to: 'open', changedAt: fixture.context.snapshot + 'T12:00:00.000Z',
            changedBy: 'Fictional operator',
        }],
    };
    const report = buildSyntheticReviewQueue(buildEvidenceMatrix(
        fixture.assets, [...fixture.logs, synthetic], fixture.context.snapshot));
    assert.equal(query(report).matched, 13);
    assert.equal(query(report, { category: 'recorded-consistent' }).matched, 4);
    assert.equal(query(report, { diagnostic: 'MISSING_HISTORY' }).matched, 9);
});
