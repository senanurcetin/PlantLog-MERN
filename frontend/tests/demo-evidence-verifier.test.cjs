const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const {
    inspectEvidenceBytes, serializeReport, verifyEvidenceFile, MAX_ARTIFACT_BYTES,
} = require('../scripts/verify-scientific-evidence.cjs');
const { buildReport } = require('../scripts/demo-scientific-evidence.cjs');

const expectedReport = buildReport();
const expected = serializeReport(expectedReport);
const checksum = bytes => createHash('sha256').update(bytes).digest('hex');
const edit = transform => {
    const changed = JSON.parse(expected.toString('utf8'));
    transform(changed);
    return serializeReport(changed);
};

test('exact local synthetic evidence bytes verify with a reproducible checksum', () => {
    const result = inspectEvidenceBytes(expected, expected);
    assert.equal(result.ok, true);
    assert.equal(result.code, 'VERIFIED');
    assert.equal(result.schemaVersion, 5);
    assert.equal(result.reportSha256, checksum(expected));
    assert.equal(result.fixtureSha256, expectedReport.source.fixtureSHA256);
    assert.equal(result.bytes, expected.length);
});

test('valid but tampered scientific counts cannot be verified', () => {
    const altered = edit(report => { report.evidenceIntersection.cells[0].rows += 1; });
    assert.equal(inspectEvidenceBytes(altered, expected).code, 'CONTENT_MISMATCH');
    const swappedDigest = edit(report => { report.source.fixtureSHA256 = '0'.repeat(64); });
    assert.equal(inspectEvidenceBytes(swappedDigest, expected).code, 'CONTENT_MISMATCH');
    const swappedValidity = edit(report => {
        report.temporalBoundaryExperiments.cases[0].matchesExpected = false;
    });
    assert.equal(inspectEvidenceBytes(swappedValidity, expected).code, 'CONTENT_MISMATCH');
});

test('noncanonical bytes, invalid JSON and incompatible schema are rejected distinctly', () => {
    const compact = Buffer.from(JSON.stringify(expectedReport) + '\n');
    assert.equal(inspectEvidenceBytes(compact, expected).code, 'NON_CANONICAL');
    const extraNewline = Buffer.concat([expected, Buffer.from('\n')]);
    assert.equal(inspectEvidenceBytes(extraNewline, expected).code, 'NON_CANONICAL');
    assert.equal(inspectEvidenceBytes(Buffer.from('not-json'), expected).code, 'INVALID_JSON');
    assert.equal(inspectEvidenceBytes(expected.subarray(0, 13), expected).code, 'INVALID_JSON');
    assert.equal(inspectEvidenceBytes(edit(report => { report.schemaVersion = 4; }), expected)
        .code, 'SCHEMA_MISMATCH');
    assert.equal(inspectEvidenceBytes(Buffer.from('null'), expected).code, 'SCHEMA_MISMATCH');
});

test('oversize or wrong-type buffers fail closed without dumping data', () => {
    assert.equal(inspectEvidenceBytes(Buffer.alloc(MAX_ARTIFACT_BYTES + 1), expected)
        .code, 'OVERSIZE');
    assert.equal(inspectEvidenceBytes('not bytes', expected).code, 'INVALID_INPUT');
    assert.equal(inspectEvidenceBytes(expected, 'not bytes').code, 'INVALID_INPUT');
});

test('read-only verifier accepts an archived copy and reports missing files safely', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'plantlog-science-verify-'));
    try {
        const filename = path.join(dir, 'evidence.json');
        writeFileSync(filename, expected);
        const before = checksum(readFileSync(filename));
        const result = verifyEvidenceFile(filename);
        assert.equal(result.code, 'VERIFIED');
        assert.equal(checksum(readFileSync(filename)), before,
            'verification must never rewrite, repair or reformat archived evidence');
        assert.deepEqual(verifyEvidenceFile(path.join(dir, 'absent.json')).code,
            'MISSING_ARTIFACT');
        assert.equal(verifyEvidenceFile(dir).code, 'NOT_REGULAR_FILE');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('offline CLI reports success or nonzero failure with no artifact contents printed', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'plantlog-science-cli-'));
    const script = path.resolve(__dirname, '../scripts/verify-scientific-evidence.cjs');
    try {
        const valid = path.join(dir, 'valid.json');
        const invalid = path.join(dir, 'invalid.json');
        writeFileSync(valid, expected);
        writeFileSync(invalid, edit(report => { report.baseline.eligibleRows = -1; }));
        const pass = execFileSync(process.execPath, [script, valid], {
            encoding: 'utf8', timeout: 20000,
        });
        assert.match(pass, /Scientific evidence: VERIFIED; schema=5/);
        assert.match(pass, /independently rebuilt/);
        const reject = spawnSync(process.execPath, [script, invalid], {
            encoding: 'utf8', timeout: 20000,
        });
        assert.equal(reject.status, 1);
        assert.match(reject.stderr, /NOT VERIFIED \(CONTENT_MISMATCH\)/);
        assert.doesNotMatch(reject.stderr, /eligibleRows|fictional operator|L007/);
        assert.equal(readFileSync(invalid, 'utf8'), edit(report => {
            report.baseline.eligibleRows = -1;
        }).toString('utf8'));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
