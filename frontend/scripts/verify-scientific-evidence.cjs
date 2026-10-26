/**
 * Standalone OFFLINE verifier for a previously generated synthetic audit.
 *
 * This reconstructs the expected report from the checked-out fixture and
 * sources. It never creates, edits, repairs or uploads an artifact and does
 * not inspect any live PlantLog API, database or plant devices.
 *
 * A SHA-256 digest is a reproducible checksum, NOT a signature, external
 * attestation, authentic plant provenance or proof against source compromise.
 */
const { readFileSync, lstatSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { buildReport } = require('./demo-scientific-evidence.cjs');

const ARTIFACT = path.resolve(__dirname, '../test-artifacts/scientific-evidence.json');
const MAX_ARTIFACT_BYTES = 1024 * 1024;
const REQUIRED_SCHEMA = 5;

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const serializeReport = report => Buffer.from(JSON.stringify(report, null, 2) + '\n', 'utf8');

const failure = (code, message) => ({ ok: false, code, message });

/**
 * Pure, in-memory inspection with separately provided reference bytes.
 * Error messages deliberately omit any file content or confidential fields.
 */
function inspectEvidenceBytes(actual, expected) {
    if (!Buffer.isBuffer(actual) || !Buffer.isBuffer(expected)) {
        return failure('INVALID_INPUT', 'Both inputs must be byte buffers');
    }
    if (actual.length > MAX_ARTIFACT_BYTES) {
        return failure('OVERSIZE', 'Evidence is larger than the offline verification limit');
    }
    let parsed;
    try {
        parsed = JSON.parse(actual.toString('utf8'));
    } catch {
        return failure('INVALID_JSON', 'Evidence is not valid JSON');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) ||
        parsed.schemaVersion !== REQUIRED_SCHEMA) {
        return failure('SCHEMA_MISMATCH', 'Evidence schema does not match the local verifier');
    }
    if (!actual.equals(serializeReport(parsed))) {
        return failure('NON_CANONICAL', 'Evidence bytes are not canonical deterministic JSON');
    }
    if (!actual.equals(expected)) {
        return failure('CONTENT_MISMATCH', 'Evidence does not match independently rebuilt local sources');
    }
    return {
        ok: true,
        code: 'VERIFIED',
        schemaVersion: REQUIRED_SCHEMA,
        bytes: actual.length,
        reportSha256: sha256(actual),
        fixtureSha256: parsed.source.fixtureSHA256,
    };
}

/**
 * No network or dynamic paths inside the report. An explicit filename is
 * allowed solely for reviewers comparing an archived copy.
 */
function verifyEvidenceFile(filename = ARTIFACT) {
    let actual;
    try {
        const metadata = lstatSync(filename);
        if (!metadata.isFile()) return failure('NOT_REGULAR_FILE', 'Evidence path must be a regular file');
        if (metadata.size > MAX_ARTIFACT_BYTES) {
            return failure('OVERSIZE', 'Evidence is larger than the offline verification limit');
        }
        actual = readFileSync(filename);
    } catch (error) {
        return failure(error && error.code === 'ENOENT' ? 'MISSING_ARTIFACT' : 'READ_ERROR',
            'Cannot read the requested evidence artifact');
    }
    // Rebuild only after validating the file shape and byte size.
    const expected = serializeReport(buildReport());
    return inspectEvidenceBytes(actual, expected);
}

function main(args = process.argv.slice(2)) {
    if (args.length > 1 || args[0] === '--help' || args[0] === '-h') {
        process.stdout.write('Usage: node scripts/verify-scientific-evidence.cjs [saved-report.json]\n');
        if (args.length > 1) process.exitCode = 2;
        return;
    }
    const result = verifyEvidenceFile(args.length ? path.resolve(args[0]) : ARTIFACT);
    if (!result.ok) {
        process.stderr.write('Scientific evidence: NOT VERIFIED (' + result.code + ') — ' +
            result.message + '\n');
        process.exitCode = 1;
        return;
    }
    process.stdout.write('Scientific evidence: VERIFIED; schema=' + result.schemaVersion +
        '; bytes=' + result.bytes + '; reportSHA256=' + result.reportSha256 +
        '; fixtureSHA256=' + result.fixtureSha256 +
        '; independently rebuilt from the local synthetic fixture and source code\n');
}

if (require.main === module) main();

module.exports = {
    ARTIFACT, MAX_ARTIFACT_BYTES, REQUIRED_SCHEMA, serializeReport,
    inspectEvidenceBytes, verifyEvidenceFile, main,
};
