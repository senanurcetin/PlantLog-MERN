/**
 * Reproducible, machine-readable scientific audit for the *synthetic* PlantLog
 * fixture. No plant inputs, internet connection, clock, random generator,
 * personal information or real reliability estimates are involved.
 */
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const ts = require('typescript');

const frontend = path.resolve(__dirname, '..');
const sourceDir = path.join(frontend, 'src', 'demo');
const cache = new Map();

function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = readFileSync(path.join(sourceDir, name), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const moduleObject = { exports: {} };
    new Function('require', 'module', 'exports', compiled)((dependency) => {
        if (!dependency.startsWith('./')) {
            throw new Error('Unexpected import in audited demo: ' + dependency);
        }
        return load(dependency.slice(2) + '.ts');
    }, moduleObject, moduleObject.exports);
    cache.set(name, moduleObject.exports);
    return moduleObject.exports;
}

const fixtureBytes = readFileSync(path.join(sourceDir, 'fixture.json'));
const fixture = JSON.parse(fixtureBytes.toString('utf8'));
const { buildDemoInsights } = load('insights.ts');
const { assessDemoDataQuality } = load('quality.ts');
const { assessLifecycleTraceability } = load('traceability.ts');
const { runScenarioModelCheck } = load('model-check.ts');
const { buildLifecycleFaultExperiments } = load('traceability-experiments.ts');
const { buildTemporalBoundaryExperiments } = load('temporal-boundaries.ts');
const { buildEvidenceMatrix, buildEvidenceMatrixProbes } = load('evidence-matrix.ts');
const { compareDemoCases } = load('comparisons.ts');
const { buildEligibilitySensitivity } = load('sensitivity.ts');

function buildReport() {
    const { assets, logs, context } = fixture;
    const snapshot = context.snapshot;
    const audit = assessDemoDataQuality(assets, logs, snapshot);
    const traceability = assessLifecycleTraceability(logs, snapshot);
    const scenarioModel = runScenarioModelCheck(assets, snapshot);
    const faultCases = buildLifecycleFaultExperiments(assets, logs, snapshot);
    const temporalBoundaries = buildTemporalBoundaryExperiments(assets);
    const evidenceMatrix = buildEvidenceMatrix(assets, logs, snapshot);
    const evidenceProbes = buildEvidenceMatrixProbes(assets, logs, snapshot);
    const workload = buildDemoInsights(assets, logs, snapshot);
    const comparisons = compareDemoCases(assets, logs, snapshot);
    const sensitivity = buildEligibilitySensitivity(assets, logs, snapshot);
    assert.equal(assets.length, 8, 'Reference set should have eight fictional assets');
    assert.equal(logs.length, 12, 'Reference set should have twelve fictional events');
    assert.equal(audit.eligibleRecords, logs.length,
        'Published reference fixture must have no excluded events');
    assert.equal(audit.findings.length, 8, 'Every published data-quality gate must run');
    assert.ok(audit.findings.every(gate => gate.count === 0),
        'Reference fixture unexpectedly violates a data-quality gate');
    assert.equal(traceability.verifiedHistory, 3);
    assert.equal(traceability.missingHistory, 9);
    assert.equal(traceability.invalidHistory, 0);
    assert.equal(traceability.observedHistoryEvents, 7);
    assert.equal(traceability.issues.length, 9);
    assert.equal(traceability.verifiedHistory + traceability.missingHistory +
        traceability.invalidHistory, logs.length);
    assert.equal(scenarioModel.exploredPrefixes, 19531);
    assert.equal(scenarioModel.acceptedActions + scenarioModel.rejectedActions +
        scenarioModel.resetActions, scenarioModel.exploredPrefixes - 1);
    assert.deepEqual(faultCases.map(row => row.id), [
        'baseline', 'unrecorded', 'shape', 'opening', 'transition',
        'timestamp', 'ordering', 'future', 'actor', 'final', 'overlap',
    ]);
    const coveredCodes = new Set(faultCases.flatMap(row =>
        row.issues.map(issue => issue.code)));
    assert.deepEqual([...coveredCodes].sort(), traceability.issues.map(issue => issue.code).sort());
    assert.ok(faultCases.every(row => row.eligibleByIndependentQualityGates === 1));
    assert.equal(temporalBoundaries.length, 12);
    assert.ok(temporalBoundaries.every(row => row.matchesExpected),
        'Synthetic UTC edge case diverged from its explicit reference expectations');
    assert.equal(evidenceMatrix.assessedRows, logs.length);
    assert.equal(evidenceMatrix.eligibleRows, audit.eligibleRecords);
    assert.deepEqual(evidenceMatrix.cells.map(cell => cell.rows), [3, 9, 0, 0, 0, 0]);
    assert.deepEqual(evidenceProbes.cells.map(cell => cell.rows), [1, 1, 1, 1, 1, 1]);
    assert.equal(evidenceProbes.assessedRows, 6);
    assert.equal(workload.totalRecords, logs.length);
    assert.equal(workload.openMaintenanceCases, 4);
    assert.equal(workload.dailyIntake.reduce((sum, day) => sum + day.total, 0) +
        workload.outsideWindow, workload.totalRecords,
    'UTC time buckets must reconcile with raw event records');
    assert.equal(workload.equipment.reduce((sum, row) => sum + row.openCases, 0) +
        workload.unlinkedOpenCases, workload.openMaintenanceCases,
    'Equipment-linked plus unlinked unresolved cases must reconcile');
    assert.deepEqual(comparisons.map(row => row.id),
        ['baseline','open-incident','open-maintenance','resolved-incident','missing-link']);
    assert.equal(comparisons.filter(row => row.id !== 'baseline' &&
        row.records === logs.length + 1).length, 4);
    assert.ok(comparisons.filter(row => row.id !== 'missing-link')
        .every(row => row.eligibleRecords === row.records && row.excludedRecords === 0));
    const missing = comparisons.find(row => row.id === 'missing-link');
    assert.equal(missing.eligibleRecords, logs.length);
    assert.equal(missing.excludedRecords, 1);
    assert.deepEqual(sensitivity.map(row => row.id),
        ['baseline','orphan','date','duplicate','overlap']);
    assert.deepEqual(sensitivity.map(row => row.eligible),[12,11,11,10,11]);
    assert.deepEqual(sensitivity.map(row => row.excluded),[0,1,1,2,1]);
    assert.equal(sensitivity.find(row => row.id === 'overlap').findings
        .reduce((sum, gate) => sum + gate.count, 0), 3);

    return {
        schemaVersion: 5,
        reportType: 'PlantLog synthetic data and quality sensitivity audit',
        source: {
            fixturePath: 'frontend/src/demo/fixture.json',
            fixtureSHA256: createHash('sha256').update(fixtureBytes).digest('hex'),
            observationDateUTC: snapshot,
            fictionalAssetCount: assets.length,
            fictionalEventCount: logs.length,
        },
        baseline: {
            assessedRows: audit.assessedRecords,
            eligibleRows: audit.eligibleRecords,
            excludedRows: audit.assessedRecords - audit.eligibleRecords,
            qualityGateCounts: audit.findings.map(({ code, count, severity }) =>
                ({ code, count, severity })),
            rawOpenIncidentMaintenanceEvents: workload.openMaintenanceCases,
            otherUnresolvedEvents: workload.otherOpenEntries,
            linkedEquipmentWithOpenCases: workload.affectedEquipment,
            unlinkedOpenIncidentMaintenanceEvents: workload.unlinkedOpenCases,
            dailyRecordedIntake: workload.dailyIntake,
            recordedOutsideDisplayedWindow: workload.outsideWindow,
        },
        lifecycleTraceability: {
            assessedRows: traceability.assessedRecords,
            internallyConsistentHistories: traceability.verifiedHistory,
            unrecordedHistories: traceability.missingHistory,
            invalidHistories: traceability.invalidHistory,
            recordedTransitionEvents: traceability.observedHistoryEvents,
            issueCounts: traceability.issues.map(({ code, count }) => ({ code, count })),
            interpretation: 'Only internal consistency of fictional status histories; missing timelines are unverified. Separate from descriptive workload eligibility.',
        },
        evidenceIntersection: {
            design: 'Independent basic eligibility and recorded timeline consistency, joined only by row position',
            assessedRows: evidenceMatrix.assessedRows,
            eligibleRows: evidenceMatrix.eligibleRows,
            excludedRows: evidenceMatrix.excludedRows,
            internallyConsistentHistories: evidenceMatrix.recordedAndVerifiedRows,
            unrecordedHistories: evidenceMatrix.unrecordedHistoryRows,
            invalidHistories: evidenceMatrix.invalidHistoryRows,
            cells: evidenceMatrix.cells,
            anonymizedRowDecisions: evidenceMatrix.rowAssessments,
            controlledSixCellProbes: {
                assessedRows: evidenceProbes.assessedRows,
                cells: evidenceProbes.cells,
                anonymizedRowDecisions: evidenceProbes.rowAssessments,
            },
        },
        temporalBoundaryExperiments: {
            semantics: 'Strict canonical Z-only timestamps and inclusive UTC snapshot endpoint; fictional inputs only',
            cases: temporalBoundaries.map(row => ({
                id: row.id,
                observationDateUTC: row.observationDateUTC,
                expected: row.expected,
                observed: row.observed,
                matchesExpected: row.matchesExpected,
            })),
        },
        scenarioModelCheck: scenarioModel,
        lifecycleFaultExperiments: {
            referenceRecordId: 'L007',
            design: 'Eleven independent copies of one documented fictional status history',
            cases: faultCases.map(row => ({
                id: row.id,
                assumption: row.assumption,
                classification: row.classification,
                qualityEligibleRows: row.eligibleByIndependentQualityGates,
                triggeredHistoryChecks: row.issues,
            })),
        },
        additiveCases: comparisons.map(row => ({
            id: row.id,
            assumption: row.assumption,
            rawRows: row.records,
            qualityEligibleRows: row.eligibleRecords,
            excludedRows: row.excludedRecords,
            rawUnresolvedCases: row.openCases,
            rawUnlinkedCases: row.unlinkedOpenCases,
            deltaRawRows: row.deltaRecords,
        })),
        integrityPerturbations: sensitivity.map(row => ({
            id: row.id,
            assumption: row.assumption,
            assessedRows: row.assessed,
            eligibleRows: row.eligible,
            excludedRows: row.excluded,
            rawUnresolvedCases: row.rawOpenCases,
            eligibleUnresolvedCases: row.eligibleOpenCases,
            auditFindings: row.findings.map(({ code, count }) => ({ code, count })),
        })),
        interpretation: {
            unit: 'one fictional event row; not equipment exposure time',
            experiment: 'independently reconstructed deterministic synthetic alterations',
            gateOverlap: 'finding counts may overlap; excluded rows are counted once',
            historyVerification: 'timeline integrity is measured separately; absent statusHistory is unverified rather than imputed',
            modelScope: 'exhaustive six-action-attempt prefixes on one fictional in-memory case; not production protocol verification',
            temporalScope: 'finite UTC boundary examples test recorded timestamp semantics only; no actual event provenance',
            intersectionScope: 'two independent software checks reconcile by input position; duplicate identifiers may cause several rows to be excluded and history validity never proves work occurred',
            claimLimits: 'No causal identification, predictive ability, uncertainty interval, MTTR, MTBF, downtime or safety certification',
        },
    };
}

function main() {
    const outputDir = path.join(frontend, 'test-artifacts');
    mkdirSync(outputDir, { recursive: true });
    const report = buildReport();
    const outputPath = path.join(outputDir, 'scientific-evidence.json');
    writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    process.stdout.write('Scientific evidence: PASS; 8 gates, 5 additive cases, ' +
        '5 integrity cases, 9 lifecycle checks, 11 fault cases, 12 UTC edge cases, 6-cell evidence matrix, 19531 action prefixes; output=test-artifacts/scientific-evidence.json\n');
}

if (require.main === module) main();
module.exports = { buildReport };
