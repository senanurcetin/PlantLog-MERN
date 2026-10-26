/**
 * CI-only MongoDB dump -> isolated namespace restore -> byte-equivalent
 * document / index verification. NEVER accepts a connection URI or source DB
 * from the caller. Does not back up or connect to real PlantLog records.
 *
 * Only runs with CI=true and the ephemeral MongoDB service container ID.
 * The archive stays inside that container and is removed in finally.
 */
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const collections = ['users', 'assets', 'logentries', 'audit_events'];
const serviceId = process.env.PLANTLOG_CI_MONGO_CONTAINER_ID;
if (process.env.CI !== 'true' || !/^[a-f0-9]{12,64}$/.test(serviceId || '')) {
    process.stderr.write('Restore check requires an ephemeral GitHub CI MongoDB service.\n');
    process.exit(2);
}

const token = randomUUID().replaceAll('-', '');
const originalName = 'plantlog_restore_source_' + token;
const restoredName = 'plantlog_restore_target_' + token;
const archive = '/tmp/plantlog-test-only-' + token + '.archive.gz';
let phase = 'configuration';
const mark = next => {
    phase = next;
    process.stdout.write('Recovery check phase: ' + phase + '\n');
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const docker = (...argv) => execFileSync('docker', ['exec', serviceId, ...argv],
    { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
const canonical = value => JSON.stringify(value);
const fingerprint = async db => {
    const data = {};
    const indexes = {};
    for (const coll of collections) {
        const rows = await db.collection(coll).find({}).sort({ _id: 1 }).toArray();
        data[coll] = { count: rows.length, sha256: sha(canonical(rows)) };
        const specs = await db.collection(coll).listIndexes().toArray();
        indexes[coll] = specs.map(({ name, key, unique, expireAfterSeconds }) =>
            ({ name, key, unique: Boolean(unique), expireAfterSeconds: expireAfterSeconds ?? null }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    return { documents: data, indexes };
};

async function run() {
    // Hard-code loopback and test-only names; environment MONGO_URI is ignored.
    const sourceURI = 'mongodb://127.0.0.1:27017/' + originalName;
    const User = require('../dist/models/User.js').default;
    const Asset = require('../dist/models/Asset.js').default;
    const LogEntry = require('../dist/models/LogEntry.js').default;
    const AuditEvent = require('../dist/models/AuditEvent.js').default;
    let source = false;
    let target = false;
    try {
        mark('connect');
        await mongoose.connect(sourceURI, { serverSelectionTimeoutMS: 10000 });
        source = true;
        mark('schema-indexes');
        await Promise.all([User.init(), Asset.init(), LogEntry.init(), AuditEvent.init()]);
        mark('seed');
        const when = new Date();
        const user = await User.create({
            name: 'Synthetic Recovery Operator',
            email: 'restore-' + token + '@example.com',
            password: '$2a$10$synthetic.fixture.value.not.a.login.hash.2026',
            role: 'operator', isActive: true,
        });
        const asset = await Asset.create({
            name: 'Synthetic recovery fixture', serialNumber: 'REC-' + token,
            category: 'equipment', location: 'Test-only bay',
            status: 'maintenance', createdBy: user._id,
            statusHistory: [
                { from: null, to: 'operational', changedAt: when, changedBy: user._id },
                { from: 'operational', to: 'maintenance', changedAt: when, changedBy: user._id },
            ],
        });
        const entry = await LogEntry.create({
            asset: asset._id, author: user._id, type: 'incident',
            title: 'Synthetic restore check', description: 'No real machinery or personnel',
            status: 'resolved', reportedAt: when, resolvedAt: when,
            metrics: { temperature: 31.2 },
            statusHistory: [
                { from: null, to: 'open', changedAt: when, changedBy: user._id },
                { from: 'open', to: 'resolved', changedAt: when, changedBy: user._id },
            ],
        });
        await AuditEvent.create({
            action: 'log.update', outcome: 'success', statusCode: 200,
            actorId: user._id, resourceType: 'log', resourceId: entry._id,
            occurredAt: when,
        });
        const sourceDb = mongoose.connection.db;
        assert.ok(sourceDb, 'Test database is not available');
        mark('fingerprint-source');
        const before = await fingerprint(sourceDb);
        for (const coll of collections) {
            assert.equal(before.documents[coll].count, 1, coll + ' requires a real fixture row');
        }
        const auditTtl = before.indexes.audit_events.find(x => x.expireAfterSeconds !== null);
        assert.equal(auditTtl?.expireAfterSeconds, 30 * 86400);

        // Run database tools in MongoDB 6 service, NOT on a user workstation.
        mark('mongodump');
        docker('mongodump', '--host=127.0.0.1:27017',
            '--db=' + originalName, '--archive=' + archive, '--gzip');
        // Mark the destination for cleanup even if restore fails halfway.
        target = true;
        mark('mongorestore');
        docker('mongorestore', '--host=127.0.0.1:27017',
            '--archive=' + archive, '--gzip',
            '--nsFrom=' + originalName + '.*', '--nsTo=' + restoredName + '.*');
        const destDb = mongoose.connection.useDb(restoredName, { useCache: true }).db;
        assert.ok(destDb, 'Restored database is not available');
        mark('fingerprint-restored');
        const after = await fingerprint(destDb);
        assert.deepEqual(after, before, 'Restore must preserve all data and indexes');

        // Extra semantic assertions: foreign keys and safety-relevant history.
        const restoredAsset = await destDb.collection('assets').findOne({ _id: asset._id });
        const restoredLog = await destDb.collection('logentries').findOne({ _id: entry._id });
        const restoredAudit = await destDb.collection('audit_events').findOne({ resourceId: entry._id });
        assert.equal(restoredAsset.createdBy.toString(), user._id.toString());
        assert.equal(restoredAsset.statusHistory.length, 2);
        assert.equal(restoredLog.asset.toString(), asset._id.toString());
        assert.equal(restoredLog.statusHistory.length, 2);
        assert.equal(restoredAudit.actorId.toString(), user._id.toString());

        mark('write-proof');
        mkdirSync(path.join(__dirname, '../test-artifacts'), { recursive: true });
        const proof = {
            schemaVersion: 1,
            scope: 'CI ephemeral loopback MongoDB 6 only; not a production backup',
            verification: 'mongodump archive restored to a distinct disposable namespace',
            collections: before.documents,
            preservedIndexMetadata: true,
            referencesAndStatusHistoryVerified: true,
            archiveExported: false,
            disasterRecoveryCertified: false,
        };
        writeFileSync(path.join(__dirname, '../test-artifacts/restore-verification.json'),
            JSON.stringify(proof, null, 2) + '\n');
        process.stdout.write('Synthetic backup/restore verification PASS: 4 collections, indexes, links, lifecycle\n');
    } finally {
        mark('cleanup');
        if (source) {
            // Never delete caller-controlled data: both names were generated here
            // under fixed prefixes using a random UUID.
            try { await mongoose.connection.dropDatabase(); } catch { process.stderr.write('Source cleanup failed\n'); }
            if (target) {
                try { await mongoose.connection.useDb(restoredName).dropDatabase(); }
                catch { process.stderr.write('Restore cleanup failed\n'); }
            }
            await mongoose.disconnect();
        }
        try { docker('rm', '-f', archive); }
        catch { process.stderr.write('Test archive cleanup failed\n'); }
    }
}

run().catch(err => {
    // Report only the stage and generic code; raw DB errors may contain URIs.
    process.stderr.write('Synthetic restore verification FAILED at phase=' +
        phase + ' type=' + (err?.name || 'Unknown') +
        ' code=' + (err?.code || 'unknown') + '\n');
    process.exitCode = 1;
});
