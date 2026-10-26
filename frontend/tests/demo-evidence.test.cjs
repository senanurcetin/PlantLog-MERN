const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const script = path.resolve(__dirname, '../scripts/demo-scientific-evidence.cjs');
const artifact = path.resolve(__dirname, '../test-artifacts/scientific-evidence.json');

test('scientific evidence is reproducible, auditable and follows actual fixture gates', () => {
    const firstResult = execFileSync(process.execPath, [script], {
        encoding: 'utf8', timeout: 20000,
    });
    assert.match(firstResult, /Scientific evidence: PASS/);
    const first = readFileSync(artifact);
    const report = JSON.parse(first.toString('utf8'));
    assert.equal(report.schemaVersion, 4);
    assert.match(report.source.fixtureSHA256, /^[a-f0-9]{64}$/);
    assert.equal(report.source.fictionalAssetCount, 8);
    assert.equal(report.source.fictionalEventCount, 12);
    assert.equal(report.baseline.eligibleRows, 12);
    assert.equal(report.baseline.qualityGateCounts.length, 8);
    assert.equal(report.baseline.rawOpenIncidentMaintenanceEvents, 4);
    assert.deepEqual({
        assessed: report.lifecycleTraceability.assessedRows,
        verified: report.lifecycleTraceability.internallyConsistentHistories,
        missing: report.lifecycleTraceability.unrecordedHistories,
        invalid: report.lifecycleTraceability.invalidHistories,
        events: report.lifecycleTraceability.recordedTransitionEvents,
    }, { assessed: 12, verified: 3, missing: 9, invalid: 0, events: 7 });
    assert.equal(report.lifecycleTraceability.issueCounts.length, 9);
    assert.equal(report.temporalBoundaryExperiments.cases.length, 12);
    assert.ok(report.temporalBoundaryExperiments.cases.every(x => x.matchesExpected));
    assert.deepEqual(report.temporalBoundaryExperiments.cases.map(x => x.id), [
        'ordinary', 'final-millisecond', 'post-snapshot-transition',
        'reversed-time', 'leap-day', 'non-leap-day', 'offset-opening',
        'local-event', 'year-boundary', 'future-opening', 'unrecorded',
        'equal-transition-time',
    ]);
    assert.equal(report.scenarioModelCheck.maximumSequenceLength, 6);
    assert.equal(report.scenarioModelCheck.exploredPrefixes, 19531);
    assert.equal(report.scenarioModelCheck.distinctPhases.length, 5);
    assert.equal(report.scenarioModelCheck.acceptedActions +
        report.scenarioModelCheck.rejectedActions +
        report.scenarioModelCheck.resetActions, 19530);
    assert.equal(report.lifecycleFaultExperiments.referenceRecordId, 'L007');
    assert.equal(report.lifecycleFaultExperiments.cases.length, 11);
    assert.deepEqual(report.lifecycleFaultExperiments.cases.map(x => x.classification), [
        'verified', 'unrecorded', 'invalid', 'invalid', 'invalid',
        'invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid',
    ]);
    assert.equal(report.lifecycleFaultExperiments.cases.at(-1).triggeredHistoryChecks.length, 4);
    assert.equal(report.lifecycleFaultExperiments.cases.every(x => x.qualityEligibleRows === 1), true);
    assert.deepEqual(report.lifecycleTraceability.issueCounts
        .filter(item => item.count > 0), [{ code: 'MISSING_HISTORY', count: 9 }]);
    assert.deepEqual(report.additiveCases.map(x => x.qualityEligibleRows),
        [12,13,13,13,12]);
    assert.deepEqual(report.integrityPerturbations.map(x => x.excludedRows),
        [0,1,1,2,1]);
    assert.equal(report.integrityPerturbations[4].auditFindings.length, 3);

    execFileSync(process.execPath, [script], { encoding: 'utf8', timeout: 20000 });
    const repeated = readFileSync(artifact);
    assert.deepEqual(repeated, first, 'report bytes must not depend on clock or RNG');
});

test('audit report promises no reliability inference and identifies data provenance', () => {
    const report = JSON.parse(readFileSync(artifact, 'utf8'));
    assert.match(report.interpretation.claimLimits, /MTTR/);
    assert.match(report.interpretation.claimLimits, /causal/i);
    assert.equal(report.source.fixturePath, 'frontend/src/demo/fixture.json');
});
