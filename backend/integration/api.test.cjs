const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const app = require('../dist/app.js').default;
const User = require('../dist/models/User.js').default;
const Asset = require('../dist/models/Asset.js').default;
const LogEntry = require('../dist/models/LogEntry.js').default;
const AuditEvent = require('../dist/models/AuditEvent.js').default;

// Always create a fresh local test-only database. Never accept a production URI.
test('authenticated registry lifecycle with MongoDB', { timeout: 60000 }, async (t) => {
    const database = 'plantlog_integration_' + randomUUID().replace(/-/g, '');
    const mongoUri = 'mongodb://127.0.0.1:27017/' + database;
    process.env.JWT_SECRET = 'test-only-unique-local-jwt-secret-for-ci-tests-2026';

    // Before connecting, process liveness is true but DB readiness must be
    // false; monitoring must never label a disconnected API as ready.
    const disconnected = app.listen(0, '127.0.0.1');
    await new Promise(resolve => disconnected.once('listening', resolve));
    const disconnectedBase = 'http://127.0.0.1:' + disconnected.address().port;
    const notReady = await fetch(disconnectedBase + '/api/health/ready');
    assert.equal(notReady.status, 503);
    assert.deepEqual(await notReady.json(), { status: 'unavailable' });
    assert.equal(notReady.headers.get('cache-control'), 'no-store');
    const liveWithoutDb = await fetch(disconnectedBase + '/api/health/live');
    assert.equal(liveWithoutDb.status, 200);
    assert.deepEqual(await liveWithoutDb.json(),
        { status: 'alive', service: 'plantlog-api' });
    await new Promise((resolve, reject) => disconnected.close(err => err ? reject(err) : resolve()));

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
    // A true DB index check is required: application-level findOne checks
    // alone cannot prevent a concurrent case-insensitive identity collision.
    await Asset.init();
    const indexes = await Asset.collection.indexes();
    const serialIndex = indexes.find(index => index.name === 'serial_number_unique_casefold');
    assert.equal(serialIndex?.unique, true);
    assert.deepEqual(serialIndex?.key, { serialNumber: 1 });
    assert.equal(serialIndex?.collation?.strength, 2);
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));

    t.after(async () => {
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    const base = 'http://127.0.0.1:' + server.address().port + '/api';
    // Browser read access is limited to explicit origins; CORS is not auth.
    const allowedCors = await fetch(base + '/health', {
        headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(allowedCors.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(allowedCors.headers.get('access-control-allow-credentials'), null);
    const blockedCors = await fetch(base + '/health', {
        headers: { Origin: 'https://unauthorized.example' },
    });
    assert.equal(blockedCors.headers.get('access-control-allow-origin'), null);
    const preflight = await fetch(base + '/assets', {
        method: 'OPTIONS',
        headers: {
            Origin: 'http://localhost:5173',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Authorization',
        },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');


    const encodedForm = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=operator%40example.com&password=invalid',
    });
    assert.equal(encodedForm.status, 415);
    const wrongType = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{"email":"bad@example.com"}',
    });
    assert.equal(wrongType.status, 415);
    const invalidJson = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"email":',
    });
    assert.equal(invalidJson.status, 400);
    const oversizedBody = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'x'.repeat(33000), password: 'test' }),
    });
    assert.equal(oversizedBody.status, 413);
    assert.equal((await fetch(base + '/health')).status, 200);
    const ready = await fetch(base + '/health/ready');
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { status: 'ready' });
    assert.equal(ready.headers.get('cache-control'), 'no-store');


    const api = async (method, path, token, body, extraHeaders = {}) => {
        const result = await fetch(base + path, {
            method,
            headers: {
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...extraHeaders,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = result.status === 204 ? null : await result.json();
        return { status: result.status, data };
    };

    const suffix = randomUUID().replace(/-/g, '');
    const password = 'ci-only-strong-password-12345';
    const emailA = 'operator' + suffix + '@example.com';
    const emailB = 'reviewer' + suffix + '@example.com';

    const privileged = await api('POST', '/auth/register', null, {
        name: 'Demo Operator', email: 'admin' + suffix + '@example.com',
        password, role: 'admin',
    });
    assert.equal(privileged.status, 400, JSON.stringify(privileged.data));

    for (const invalid of [
        { name: 'Invalid email', email: 'email-without-at', password },
        { name: 'Invalid email', email: 'operator@invalid', password },
        { name: 'Long password', email: 'long' + suffix + '@example.com',
            password: 'X'.repeat(73) },
        { name: 'Unexpected field', email: 'spoof' + suffix + '@example.com',
            password, isActive: true },
    ]) {
        const response = await api('POST', '/auth/register', null, invalid);
        assert.equal(response.status, 400, JSON.stringify(response.data));
    }

    const registrationA = await api('POST', '/auth/register', null, {
        name: 'Demo Operator', email: emailA, password,
    });
    assert.equal(registrationA.status, 201, JSON.stringify(registrationA.data));
    assert.equal(registrationA.data.role, 'operator');
    const longTld = 'longtld' + suffix + '@example.technology';
    const longTldRegistration = await api('POST', '/auth/register', null, {
        name: 'Long TLD Example', email: longTld.toUpperCase(), password,
    });
    assert.equal(longTldRegistration.status, 201,
        'API-accepted long-TLD email must also satisfy Mongo User schema');
    assert.equal((await api('POST', '/auth/login', null, {
        email: longTld, password,
    })).status, 200);
    const operator = registrationA.data.token;

    const registrationB = await api('POST', '/auth/register', null, {
        name: 'Demo Reviewer', email: emailB, password,
    });
    assert.equal(registrationB.status, 201, JSON.stringify(registrationB.data));
    let reviewer = registrationB.data.token;

    // Selector-shaped login bodies must never reach User.findOne as query operators.
    assert.equal((await api('POST', '/auth/login', null, {
        email: { $ne: null }, password,
    })).status, 400);
    assert.equal((await api('POST', '/auth/login', null, {
        email: emailA, password: { $ne: null },
    })).status, 400);
    const caseInsensitiveLogin = await api('POST', '/auth/login', null, {
        email: emailA.toUpperCase(), password,
    });
    assert.equal(caseInsensitiveLogin.status, 200);

    assert.equal((await api('POST', '/auth/login', null, { email: emailA, password: 'wrong' })).status, 401);
    assert.equal((await api('POST', '/auth/login', null, { email: emailA, password })).status, 200);
    assert.equal((await api('GET', '/assets')).status, 401);
    // Production mode disables public registration unless explicitly enabled.
    const previousNode = process.env.NODE_ENV;
    const previousSetting = process.env.REGISTRATION_ENABLED;
    try {
        process.env.NODE_ENV = 'production';
        delete process.env.REGISTRATION_ENABLED;
        assert.equal((await api('POST', '/auth/register', null, {
            name: 'Disabled Account', email: 'disabled' + suffix + '@example.com', password,
        })).status, 403);
    } finally {
        if (previousNode === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNode;
        if (previousSetting === undefined) delete process.env.REGISTRATION_ENABLED;
        else process.env.REGISTRATION_ENABLED = previousSetting;
    }


    const createdAsset = await api('POST', '/assets', operator, {
        name: 'Synthetic Conveyor', serialNumber: 'DEMO-' + suffix,
        category: 'equipment', status: 'operational', location: 'Fixture Bay',
    });
    assert.equal(createdAsset.status, 201, JSON.stringify(createdAsset.data));
    const assetId = createdAsset.data._id;
    assert.equal(createdAsset.data.statusHistory.length, 1);
    assert.equal(createdAsset.data.statusHistory[0].from, null);
    assert.equal(createdAsset.data.statusHistory[0].to, 'operational');
    assert.equal(createdAsset.data.statusHistory[0].changedBy, registrationA.data._id);
    // Case-only duplicates are forbidden even if Mongoose's normal string
    // equality check would not identify them.
    const duplicateCase = await api('POST', '/assets', operator, {
        name: 'Duplicate fictional conveyor', serialNumber: ('DEMO-' + suffix).toLowerCase(),
        category: 'equipment', location: 'Fixture Bay',
    });
    assert.equal(duplicateCase.status, 400);
    const rawCollision = await Promise.allSettled([
        Asset.create({ name: 'Concurrent duplicate A', serialNumber: 'RACE-' + suffix,
            category: 'equipment', location: 'Fixture Bay', createdBy: registrationA.data._id }),
        Asset.create({ name: 'Concurrent duplicate B', serialNumber: 'race-' + suffix,
            category: 'equipment', location: 'Fixture Bay', createdBy: registrationA.data._id }),
    ]);
    assert.equal(rawCollision.filter(result => result.status === 'fulfilled').length, 1,
        'MongoDB, not a racy HTTP preflight, must enforce serial identity');
    assert.equal(rawCollision.filter(result =>
        result.status === 'rejected' && result.reason.code === 11000).length, 1);
    assert.equal(await Asset.countDocuments({
        serialNumber: { $regex: '^RACE-' + suffix + '

    for (const injected of [
        { createdBy: registrationB.data._id },
        { status: 'maintenance' },
        { status: 'decommissioned' },
        { 'createdBy.role': 'admin' },
        { name: { $ne: null } },
        { category: { $ne: null } },
        { purchaseDate: '2025-02-29' },
    ]) {
        const malformed = await api('POST', '/assets', operator, {
            name: 'Forged Asset', serialNumber: 'FORGED-' + suffix,
            category: 'equipment', location: 'Fixture Bay', ...injected,
        });
        assert.equal(malformed.status, 400, JSON.stringify(malformed.data));
    }
    const allAssets = await api('GET', '/assets', operator);
    assert.equal(allAssets.status, 200);
    assert.equal(allAssets.data.filter(asset => asset.serialNumber === 'FORGED-' + suffix).length, 0);

    const assetDetail = await api('GET', '/assets/' + assetId, operator);
    assert.equal(assetDetail.status, 200);
    assert.equal(assetDetail.data.createdBy.name, 'Demo Operator');
    assert.equal(assetDetail.data.createdBy.email, undefined);
    const assetListing = await api('GET', '/assets', reviewer);
    assert.equal(assetListing.status, 200);
    assert.equal(assetListing.data.find(asset => asset._id === assetId).createdBy.email, undefined);
    assert.equal((await api('PUT', '/assets/' + assetId, operator, { status: 'maintenance' })).status, 403);
    assert.equal((await api('DELETE', '/assets/' + assetId, operator)).status, 403);

    const createdLog = await api('POST', '/logs', operator, {
        assetId, type: 'incident', title: 'Synthetic belt fault',
        description: 'No actual equipment affected; only a test fixture.', status: 'open',
    });
    assert.equal(createdLog.status, 201, JSON.stringify(createdLog.data));
    const logId = createdLog.data._id;
    for (const injected of [
        { author: registrationB.data._id },
        { reportedAt: '2000-01-01T00:00:00Z' },
        { statusHistory: [] },
        { metrics: { temperature: 'bad' } },
        { type: { $ne: null } },
    ]) {
        const forged = await api('POST', '/logs', operator, {
            assetId, type: 'incident', title: 'Injection blocked',
            description: 'Creation payload must be rejected', ...injected,
        });
        assert.equal(forged.status, 400, JSON.stringify(forged.data));
    }

    assert.equal(createdLog.data.status, 'open');
    assert.equal(createdLog.data.statusHistory.length, 1);
    assert.equal(createdLog.data.statusHistory[0].to, 'open');
    assert.equal(createdLog.data.reportedAt, createdLog.data.statusHistory[0].changedAt);
    assert.equal((await api('POST', '/logs', operator, {
        assetId, type: 'incident', title: 'Invalid closed creation',
        description: 'Disallow fake initial resolution', status: 'resolved',
    })).status, 400);
    const filtered = await api('GET', '/logs?assetId=' + assetId, operator);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.length, 1);
    assert.equal(filtered.data[0].author.name, 'Demo Operator');
    assert.equal(filtered.data[0].author.email, undefined);
    assert.equal((await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' })).status, 403);
    const acknowledged = await api('PUT', '/logs/' + logId, operator, { status: 'acknowledged' });
    assert.equal(acknowledged.status, 200, JSON.stringify(acknowledged.data));
    assert.equal(acknowledged.data.statusHistory.length, 2);
    assert.ok(acknowledged.data.acknowledgedAt);
    assert.equal((await api('PUT', '/logs/' + logId, operator, {
        status: 'open',
    })).status, 400);
    assert.equal((await api('PUT', '/logs/' + logId, operator, {
        statusHistory: [],
    })).status, 400);
    for (const invalid of [
        { title: { $ne: null } }, { description: ' ' },
        { type: { $ne: null } }, { type: 'fault' },
        { title: 'X'.repeat(201) }, { status: 3 },
    ]) {
        const patch = await api('PUT', '/logs/' + logId, operator, invalid);
        assert.equal(patch.status, 400, JSON.stringify(patch.data));
    }
    const working = await api('PUT', '/logs/' + logId, operator, { status: 'in_progress' });
    assert.equal(working.status, 200, JSON.stringify(working.data));
    assert.equal(working.data.statusHistory.length, 3);
    assert.ok(working.data.workStartedAt);

    // Trusted fixture elevation, never exposed as a public HTTP endpoint.
    await User.updateOne({ email: emailB }, { $set: { role: 'supervisor' } });
    // Privilege changes must invalidate credentials minted for a different
    // account role. The user must explicitly re-authenticate.
    assert.equal((await api('GET', '/assets', reviewer)).status, 401);
    const supervisorLogin = await api('POST', '/auth/login', null, {
        email: emailB, password,
    });
    assert.equal(supervisorLogin.status, 200);
    assert.equal(supervisorLogin.data.role, 'supervisor');
    reviewer = supervisorLogin.data.token;
    const elevated = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(elevated.status, 200, JSON.stringify(elevated.data));
    assert.equal(elevated.data.status, 'maintenance');
    assert.equal(elevated.data.statusHistory.length, 2);
    assert.equal(elevated.data.statusHistory[1].from, 'operational');
    assert.equal(elevated.data.statusHistory[1].to, 'maintenance');
    assert.equal(elevated.data.statusHistory[1].changedBy._id, registrationB.data._id);
    assert.ok(Date.parse(elevated.data.statusHistory[1].changedAt) > 0);
    const sameStatus = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(sameStatus.status, 200);
    assert.equal(sameStatus.data.statusHistory.length, 2);
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { statusHistory: [] })).status, 400);
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { status: 'nonsense' })).status, 400);
    for (const invalid of [
        { name: { $gt: '' } }, { location: 123 }, { category: 'impossible' },
        { serialNumber: '' }, { purchaseDate: '2025-02-29' },
        { purchaseDate: { $ne: null } },
    ]) {
        const patch = await api('PUT', '/assets/' + assetId, reviewer, invalid);
        assert.equal(patch.status, 400, JSON.stringify(patch.data));
    }
    const restored = await api('PUT', '/assets/' + assetId, reviewer, { status: 'operational' });
    assert.equal(restored.status, 200, JSON.stringify(restored.data));
    assert.equal(restored.data.statusHistory.length, 3);
    const assetDetails = await api('GET', '/assets/' + assetId, operator);
    assert.equal(assetDetails.status, 200);
    assert.equal(assetDetails.data.statusHistory.length, 3);
    assert.equal(assetDetails.data.statusHistory[2].changedBy._id, registrationB.data._id);

    const resolved = await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
    assert.equal(resolved.data.statusHistory.length, 4);
    assert.ok(resolved.data.resolvedAt);
    assert.equal(resolved.data.statusHistory[3].to, 'resolved');
    for (const forbidden of [
        { status: 'open' },
        { status: 'resolved' },
        { title: 'Changed after close' },
        { description: 'Rewritten evidence' },
        { type: 'operation' },
        { metrics: { temperature: 999 } },
    ]) {
        const edit = await api('PUT', '/logs/' + logId, reviewer, forbidden);
        assert.equal(edit.status, 409, JSON.stringify(edit.data));
    }
    const preserved = await api('GET', '/logs?assetId=' + assetId, operator);
    const originalResolved = preserved.data.find((entry) => entry._id === logId);
    assert.equal(originalResolved.title, 'Synthetic belt fault');
    assert.equal(originalResolved.status, 'resolved');
    assert.equal(originalResolved.statusHistory.length, 4);

    const summary = await api('GET', '/analytics/maintenance?days=30', operator);
    assert.equal(summary.status, 200, JSON.stringify(summary.data));
    assert.equal(summary.data.records, 1);
    assert.equal(summary.data.eligibleResolved, 1);
    assert.equal(summary.data.legacyOrIncomplete, 0);
    assert.equal(summary.data.unresolved, 0);
    assert.equal(summary.data.intakeBuckets.length, 7);
    assert.equal(summary.data.intakeBuckets.reduce((count, item) =>
        count + item.incident + item.maintenance, 0), summary.data.records);
    assert.deepEqual(summary.data.byType.incident, {
        records: 1, unresolved: 0, eligibleResolved: 1, legacyOrIncomplete: 0,
    });
    assert.deepEqual(summary.data.byType.maintenance, {
        records: 0, unresolved: 0, eligibleResolved: 0, legacyOrIncomplete: 0,
    });
    assert.deepEqual(summary.data.unresolvedAge, {
        under24Hours: 0, from24To72Hours: 0, over72Hours: 0, unknownStart: 0,
    });
    assert.ok(Number.isFinite(summary.data.averageHoursToResolve));
    assert.match(summary.data.interpretation, /Not machine downtime/);
    assert.equal((await api('GET', '/analytics/maintenance?days=0', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/maintenance?days=366', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/maintenance')).status, 401);

    // Pre-existing records lack server-recorded events; do not backfill fictional times.
    await LogEntry.create({
        asset: assetId, author: registrationA.data._id,
        type: 'maintenance', status: 'resolved', title: 'Legacy fixture',
        description: 'Imported record without trustworthy event timestamps',
    });
    const legacySummary = await api('GET', '/analytics/maintenance?days=30', operator);
    assert.equal(legacySummary.status, 200);
    assert.equal(legacySummary.data.records, 2);
    assert.equal(legacySummary.data.eligibleResolved, 1);
    assert.equal(legacySummary.data.legacyOrIncomplete, 1);
    assert.equal(legacySummary.data.byType.maintenance.legacyOrIncomplete, 1);
    assert.equal(legacySummary.data.byType.incident.eligibleResolved, 1);
    // Workload is open cases *created in the window*, not all historic open items.
    const backlogAsset = await api('POST', '/assets', operator, {
        name: 'Synthetic Pump', serialNumber: 'BACKLOG-' + suffix,
        category: 'machinery', location: 'Fixture Lab',
    });
    assert.equal(backlogAsset.status, 201, JSON.stringify(backlogAsset.data));
    for (const type of ['incident', 'maintenance']) {
        const queued = await api('POST', '/logs', operator, {
            assetId: backlogAsset.data._id, type,
            title: 'Queued fixture ' + type, description: 'Synthetic open issue only',
        });
        assert.equal(queued.status, 201, JSON.stringify(queued.data));
    }
    const caseSummary = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(caseSummary.status, 200, JSON.stringify(caseSummary.data));
    assert.equal(caseSummary.data.totalOpenCases, 2);
    assert.equal(caseSummary.data.olderOpenCases, 0);
    assert.equal(caseSummary.data.undatedOpenCases, 0);
    assert.equal(caseSummary.data.futureDatedOpenCases, 0);
    assert.equal(caseSummary.data.missingAssetCases, 0);
    assert.equal(caseSummary.data.items.length, 1);
    assert.equal(caseSummary.data.items[0].assetId, backlogAsset.data._id);
    assert.equal(caseSummary.data.items[0].incidents, 1);
    assert.equal(caseSummary.data.items[0].maintenance, 1);
    assert.equal((await api('GET', '/analytics/equipment')).status, 401);
    assert.equal((await api('GET', '/analytics/equipment?days=0', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/equipment?days=366', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/equipment?days=invalid', operator)).status, 400);
    await LogEntry.create({
        asset: new mongoose.Types.ObjectId(), author: registrationA.data._id,
        type: 'incident', status: 'open', title: 'Missing asset fixture',
        description: 'Reference does not have a matching asset',
    });
    const missingAssetSummary = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(missingAssetSummary.status, 200);
    assert.equal(missingAssetSummary.data.totalOpenCases, 3);
    assert.equal(missingAssetSummary.data.missingAssetCases, 1);
    // Test-only fixtures manipulate timestamps without exposing a REST write path.
    const olderCase = await LogEntry.create({
        asset: backlogAsset.data._id, author: registrationA.data._id,
        type: 'maintenance', status: 'open',
        title: 'Old unresolved work', description: 'Fixture created outside reporting window',
    });
    await LogEntry.collection.updateOne({ _id: olderCase._id }, {
        $set: { createdAt: new Date('2024-01-01T00:00:00.000Z') },
    });
    await LogEntry.collection.insertOne({
        asset: new mongoose.Types.ObjectId(backlogAsset.data._id),
        author: new mongoose.Types.ObjectId(registrationA.data._id),
        type: 'incident', status: 'open',
        title: 'Undated historical work',
        description: 'Missing creation timestamp for regression test',
    });
    const outsidePeriod = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(outsidePeriod.status, 200, JSON.stringify(outsidePeriod.data));
    assert.equal(outsidePeriod.data.totalOpenCases, 3);
    assert.equal(outsidePeriod.data.olderOpenCases, 1);
    assert.equal(outsidePeriod.data.undatedOpenCases, 1);
    assert.equal(outsidePeriod.data.futureDatedOpenCases, 0);
    assert.equal(outsidePeriod.data.items[0].openCases, 2);
    assert.equal(missingAssetSummary.data.displayedOpenCases +
        missingAssetSummary.data.remainingOpenCases +
        missingAssetSummary.data.missingAssetCases,
        missingAssetSummary.data.totalOpenCases);

    const preventedDelete = await api('DELETE', '/assets/' + assetId, reviewer);
    assert.equal(preventedDelete.status, 409, JSON.stringify(preventedDelete.data));
    const retired = await api('PUT', '/assets/' + assetId, reviewer, { status: 'decommissioned' });
    assert.equal(retired.status, 200, JSON.stringify(retired.data));
    assert.equal(retired.data.statusHistory.length, 4);
    assert.equal(retired.data.statusHistory[3].from, 'operational');
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { status: 'operational' })).status, 400);
    const afterRetirement = await api('POST', '/logs', operator, {
        assetId, type: 'operation', title: 'Invalid post-retirement operation',
        description: 'Prevent new operational events on retired equipment',
    });
    assert.equal(afterRetirement.status, 409, JSON.stringify(afterRetirement.data));
    // Prior history remains readable, including events recorded before decommissioning.
    const historicalLogs = await api('GET', '/logs?assetId=' + assetId, operator);
    assert.equal(historicalLogs.status, 200);
    assert.equal(historicalLogs.data.length, 2);



    const disposable = await api('POST', '/assets', reviewer, {
        name: 'Unused fixture', serialNumber: 'SPARE-' + suffix,
        category: 'equipment', location: 'Storage',
    });
    assert.equal(disposable.status, 201);
    assert.equal((await api('DELETE', '/assets/' + disposable.data._id, reviewer)).status, 200);
    assert.equal((await api('GET', '/assets/not-an-object-id', operator)).status, 400);
    assert.equal((await api('GET', '/logs?assetId=bad', operator)).status, 400);
    // Signing out atomically invalidates all bearer tokens for this account
    // across different login calls, including tokens that remain unexpired.
    assert.equal((await api('GET', '/assets', operator)).status, 200);
    assert.equal((await api('POST', '/auth/logout', null, {})).status, 401);
    const logout = await api('POST', '/auth/logout', operator, {});
    assert.equal(logout.status, 204);
    assert.equal((await api('GET', '/assets', operator)).status, 401);
    assert.equal((await api('GET', '/assets', caseInsensitiveLogin.data.token)).status, 401);
    assert.equal((await api('POST', '/auth/logout', operator, {})).status, 401);
    assert.equal((await api('GET', '/assets', reviewer)).status, 200,
        'Revoking operator tokens must not revoke another account');
    const relogin = await api('POST', '/auth/login', null, {
        email: emailA, password,
    });
    assert.equal(relogin.status, 200);
    assert.equal((await api('GET', '/assets', relogin.data.token)).status, 200);

    // Operator and unauthenticated callers cannot enumerate security events.
    assert.equal((await api('GET', '/audit', relogin.data.token)).status, 403);
    assert.equal((await api('GET', '/audit')).status, 401);

    // Asynchronous post-response audit persistence must be treated as
    // eventually observed, not transactionally committed with the write.
    let auditRows = [];
    for (let attempt = 0; attempt < 50; attempt++) {
        auditRows = await AuditEvent.find().lean();
        if (auditRows.some(event => event.action === 'auth.logout' &&
                event.statusCode === 204) &&
            auditRows.some(event => event.action === 'asset.create' &&
                event.resourceId?.toString() === assetId) &&
            auditRows.some(event => event.action === 'log.update' &&
                event.statusCode === 200) &&
            auditRows.some(event => event.action === 'auth.login' &&
                event.statusCode === 401)) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(auditRows.length >= 9, 'Expected minimal audit event coverage');
    for (const action of ['auth.register', 'auth.login', 'auth.logout',
        'asset.create', 'asset.update', 'asset.delete', 'log.create', 'log.update']) {
        assert.ok(auditRows.some(event => event.action === action), action);
    }
    assert.ok(auditRows.some(event => event.action === 'auth.login' &&
        event.outcome === 'denied' && !event.actorId));
    assert.ok(auditRows.some(event => event.action === 'asset.update' &&
        event.outcome === 'denied' && event.statusCode === 403));
    const logoutEvent = auditRows.find(event => event.action === 'auth.logout' &&
        event.statusCode === 204);
    assert.equal(logoutEvent.actorId.toString(), registrationA.data._id);
    for (const event of auditRows) {
        const content = JSON.stringify(event);
        assert.equal(content.includes(password), false);
        assert.equal(content.includes(emailA), false);
        assert.equal(content.includes(emailB), false);
        assert.equal(content.includes(operator), false);
        for (const key of ['body', 'token', 'email', 'password', 'remoteAddress']) {
            assert.equal(Object.prototype.hasOwnProperty.call(event, key), false);
        }
    }

    // Only supervisors/admins can inspect the append-only, bounded history.
    const first = await api('GET', '/audit?limit=2', reviewer);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.items.length, 2);
    assert.match(first.data.nextCursor, /^[0-9a-f]{24}$/);
    const nextPage = await api('GET', '/audit?limit=2&cursor=' +
        first.data.nextCursor, reviewer);
    assert.equal(nextPage.status, 200);
    assert.equal(nextPage.data.items.length, 2);
    assert.ok(!nextPage.data.items.some(row =>
        first.data.items.some(previous => previous._id === row._id)));
    for (const invalidQuery of ['limit=0', 'limit=51', 'limit=x',
        'cursor=invalid', 'sort=password', 'limit%5B%24gt%5D=1']) {
        assert.equal((await api('GET', '/audit?' + invalidQuery, reviewer)).status, 400,
            invalidQuery);
    }
    const noWrite = await fetch(base + '/audit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + reviewer, 'Content-Type': 'application/json' },
        body: '{}',
    });
    assert.equal(noWrite.status, 404, 'Audit list must have no creation endpoint');


    // Forged/legacy JWTs with no expected role, version or audience fail
    // even if signed with this disposable test secret.
    const jwt = require('jsonwebtoken');
    const legacy = jwt.sign({ id: registrationA.data._id },
        process.env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal((await api('GET', '/assets', legacy)).status, 401);
    const wrongAudience = jwt.sign({
        id: registrationA.data._id, ver: 1, role: 'operator',
    }, process.env.JWT_SECRET, {
        expiresIn: '1h', issuer: 'plantlog-local-demo', audience: 'another-api',
    });
    assert.equal((await api('GET', '/assets', wrongAudience)).status, 401);


    // An independent synthetic fixture tests conditional writes without
    // changing the incident counts/assertions used earlier in this suite.
    const revisionAsset = await api('POST', '/assets', relogin.data.token, {
        name: 'Synthetic revision comparison', serialNumber: 'CAS-' + suffix,
        category: 'equipment', location: 'Test-only bay',
    });
    assert.equal(revisionAsset.status, 201, JSON.stringify(revisionAsset.data));
    const revisionAssetId = revisionAsset.data._id;
    const revGet = await fetch(base + '/assets/' + revisionAssetId, {
        headers: { Authorization: 'Bearer ' + reviewer },
    });
    assert.equal(revGet.headers.get('etag'), '"0"');
    const firstVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'maintenance' }, { 'If-Match': '"0"' });
    assert.equal(firstVersion.status, 200, JSON.stringify(firstVersion.data));
    assert.equal(firstVersion.data.__v, 1);
    const staleVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'operational' }, { 'If-Match': '"0"' });
    assert.equal(staleVersion.status, 412);
    const invalidRevision = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { location: 'Poisoned' }, { 'If-Match': 'W/"1"' });
    assert.equal(invalidRevision.status, 400);
    const currentVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'operational' }, { 'If-Match': '"1"' });
    assert.equal(currentVersion.status, 200);
    assert.equal(currentVersion.data.__v, 2);
    assert.equal(currentVersion.data.statusHistory.length, 3);
    const revisionLog = await api('POST', '/logs', relogin.data.token, {
        assetId: revisionAssetId, type: 'incident', title: 'Synthetic CAS comparison',
        description: 'No physical event, only an ephemeral concurrency test',
    });
    assert.equal(revisionLog.status, 201, JSON.stringify(revisionLog.data));
    const revisionLogId = revisionLog.data._id;
    assert.equal(revisionLog.data.__v, 0);
    const acknowledgedCas = await api('PUT', '/logs/' + revisionLogId, relogin.data.token,
        { status: 'acknowledged' }, { 'If-Match': '"0"' });
    assert.equal(acknowledgedCas.status, 200, JSON.stringify(acknowledgedCas.data));
    assert.equal(acknowledgedCas.data.__v, 1);
    assert.equal((await api('PUT', '/logs/' + revisionLogId, relogin.data.token,
        { status: 'resolved' }, { 'If-Match': '"0"' })).status, 412);

    // Both requests are based on exactly the same verified revision.
    // At most one mutation may win; whether the loser sees 409 (DB CAS)
    // or 412 (HTTP precondition) depends on scheduling.
    const rivals = await Promise.all([
        api('PUT', '/logs/' + revisionLogId, relogin.data.token,
            { status: 'in_progress' }, { 'If-Match': '"1"' }),
        api('PUT', '/logs/' + revisionLogId, relogin.data.token,
            { status: 'resolved' }, { 'If-Match': '"1"' }),
    ]);
    assert.equal(rivals.filter(x => x.status === 200).length, 1,
        JSON.stringify(rivals.map(x => x.status)));
    assert.ok(rivals.every(x => [200, 409, 412].includes(x.status)));
    const afterRace = await api('GET', '/logs?assetId=' + revisionAssetId, reviewer);
    assert.equal(afterRace.status, 200);
    const persisted = afterRace.data.find(x => x._id === revisionLogId);
    assert.equal(persisted.__v, 2, 'Only one revision can be committed');
    assert.equal(persisted.statusHistory.length, 3,
        'A rejected contender must not append an extra lifecycle event');
    assert.ok(['in_progress', 'resolved'].includes(persisted.status));

});
, $options: 'i' },
    }), 1);

    for (const injected of [
        { createdBy: registrationB.data._id },
        { status: 'maintenance' },
        { status: 'decommissioned' },
        { 'createdBy.role': 'admin' },
        { name: { $ne: null } },
        { category: { $ne: null } },
        { purchaseDate: '2025-02-29' },
    ]) {
        const malformed = await api('POST', '/assets', operator, {
            name: 'Forged Asset', serialNumber: 'FORGED-' + suffix,
            category: 'equipment', location: 'Fixture Bay', ...injected,
        });
        assert.equal(malformed.status, 400, JSON.stringify(malformed.data));
    }
    const allAssets = await api('GET', '/assets', operator);
    assert.equal(allAssets.status, 200);
    assert.equal(allAssets.data.filter(asset => asset.serialNumber === 'FORGED-' + suffix).length, 0);

    const assetDetail = await api('GET', '/assets/' + assetId, operator);
    assert.equal(assetDetail.status, 200);
    assert.equal(assetDetail.data.createdBy.name, 'Demo Operator');
    assert.equal(assetDetail.data.createdBy.email, undefined);
    const assetListing = await api('GET', '/assets', reviewer);
    assert.equal(assetListing.status, 200);
    assert.equal(assetListing.data.find(asset => asset._id === assetId).createdBy.email, undefined);
    assert.equal((await api('PUT', '/assets/' + assetId, operator, { status: 'maintenance' })).status, 403);
    assert.equal((await api('DELETE', '/assets/' + assetId, operator)).status, 403);

    const createdLog = await api('POST', '/logs', operator, {
        assetId, type: 'incident', title: 'Synthetic belt fault',
        description: 'No actual equipment affected; only a test fixture.', status: 'open',
    });
    assert.equal(createdLog.status, 201, JSON.stringify(createdLog.data));
    const logId = createdLog.data._id;
    for (const injected of [
        { author: registrationB.data._id },
        { reportedAt: '2000-01-01T00:00:00Z' },
        { statusHistory: [] },
        { metrics: { temperature: 'bad' } },
        { type: { $ne: null } },
    ]) {
        const forged = await api('POST', '/logs', operator, {
            assetId, type: 'incident', title: 'Injection blocked',
            description: 'Creation payload must be rejected', ...injected,
        });
        assert.equal(forged.status, 400, JSON.stringify(forged.data));
    }

    assert.equal(createdLog.data.status, 'open');
    assert.equal(createdLog.data.statusHistory.length, 1);
    assert.equal(createdLog.data.statusHistory[0].to, 'open');
    assert.equal(createdLog.data.reportedAt, createdLog.data.statusHistory[0].changedAt);
    assert.equal((await api('POST', '/logs', operator, {
        assetId, type: 'incident', title: 'Invalid closed creation',
        description: 'Disallow fake initial resolution', status: 'resolved',
    })).status, 400);
    const filtered = await api('GET', '/logs?assetId=' + assetId, operator);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.length, 1);
    assert.equal(filtered.data[0].author.name, 'Demo Operator');
    assert.equal(filtered.data[0].author.email, undefined);
    assert.equal((await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' })).status, 403);
    const acknowledged = await api('PUT', '/logs/' + logId, operator, { status: 'acknowledged' });
    assert.equal(acknowledged.status, 200, JSON.stringify(acknowledged.data));
    assert.equal(acknowledged.data.statusHistory.length, 2);
    assert.ok(acknowledged.data.acknowledgedAt);
    assert.equal((await api('PUT', '/logs/' + logId, operator, {
        status: 'open',
    })).status, 400);
    assert.equal((await api('PUT', '/logs/' + logId, operator, {
        statusHistory: [],
    })).status, 400);
    for (const invalid of [
        { title: { $ne: null } }, { description: ' ' },
        { type: { $ne: null } }, { type: 'fault' },
        { title: 'X'.repeat(201) }, { status: 3 },
    ]) {
        const patch = await api('PUT', '/logs/' + logId, operator, invalid);
        assert.equal(patch.status, 400, JSON.stringify(patch.data));
    }
    const working = await api('PUT', '/logs/' + logId, operator, { status: 'in_progress' });
    assert.equal(working.status, 200, JSON.stringify(working.data));
    assert.equal(working.data.statusHistory.length, 3);
    assert.ok(working.data.workStartedAt);

    // Trusted fixture elevation, never exposed as a public HTTP endpoint.
    await User.updateOne({ email: emailB }, { $set: { role: 'supervisor' } });
    // Privilege changes must invalidate credentials minted for a different
    // account role. The user must explicitly re-authenticate.
    assert.equal((await api('GET', '/assets', reviewer)).status, 401);
    const supervisorLogin = await api('POST', '/auth/login', null, {
        email: emailB, password,
    });
    assert.equal(supervisorLogin.status, 200);
    assert.equal(supervisorLogin.data.role, 'supervisor');
    reviewer = supervisorLogin.data.token;
    const elevated = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(elevated.status, 200, JSON.stringify(elevated.data));
    assert.equal(elevated.data.status, 'maintenance');
    assert.equal(elevated.data.statusHistory.length, 2);
    assert.equal(elevated.data.statusHistory[1].from, 'operational');
    assert.equal(elevated.data.statusHistory[1].to, 'maintenance');
    assert.equal(elevated.data.statusHistory[1].changedBy._id, registrationB.data._id);
    assert.ok(Date.parse(elevated.data.statusHistory[1].changedAt) > 0);
    const sameStatus = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(sameStatus.status, 200);
    assert.equal(sameStatus.data.statusHistory.length, 2);
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { statusHistory: [] })).status, 400);
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { status: 'nonsense' })).status, 400);
    for (const invalid of [
        { name: { $gt: '' } }, { location: 123 }, { category: 'impossible' },
        { serialNumber: '' }, { purchaseDate: '2025-02-29' },
        { purchaseDate: { $ne: null } },
    ]) {
        const patch = await api('PUT', '/assets/' + assetId, reviewer, invalid);
        assert.equal(patch.status, 400, JSON.stringify(patch.data));
    }
    const restored = await api('PUT', '/assets/' + assetId, reviewer, { status: 'operational' });
    assert.equal(restored.status, 200, JSON.stringify(restored.data));
    assert.equal(restored.data.statusHistory.length, 3);
    const assetDetails = await api('GET', '/assets/' + assetId, operator);
    assert.equal(assetDetails.status, 200);
    assert.equal(assetDetails.data.statusHistory.length, 3);
    assert.equal(assetDetails.data.statusHistory[2].changedBy._id, registrationB.data._id);

    const resolved = await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
    assert.equal(resolved.data.statusHistory.length, 4);
    assert.ok(resolved.data.resolvedAt);
    assert.equal(resolved.data.statusHistory[3].to, 'resolved');
    for (const forbidden of [
        { status: 'open' },
        { status: 'resolved' },
        { title: 'Changed after close' },
        { description: 'Rewritten evidence' },
        { type: 'operation' },
        { metrics: { temperature: 999 } },
    ]) {
        const edit = await api('PUT', '/logs/' + logId, reviewer, forbidden);
        assert.equal(edit.status, 409, JSON.stringify(edit.data));
    }
    const preserved = await api('GET', '/logs?assetId=' + assetId, operator);
    const originalResolved = preserved.data.find((entry) => entry._id === logId);
    assert.equal(originalResolved.title, 'Synthetic belt fault');
    assert.equal(originalResolved.status, 'resolved');
    assert.equal(originalResolved.statusHistory.length, 4);

    const summary = await api('GET', '/analytics/maintenance?days=30', operator);
    assert.equal(summary.status, 200, JSON.stringify(summary.data));
    assert.equal(summary.data.records, 1);
    assert.equal(summary.data.eligibleResolved, 1);
    assert.equal(summary.data.legacyOrIncomplete, 0);
    assert.equal(summary.data.unresolved, 0);
    assert.equal(summary.data.intakeBuckets.length, 7);
    assert.equal(summary.data.intakeBuckets.reduce((count, item) =>
        count + item.incident + item.maintenance, 0), summary.data.records);
    assert.deepEqual(summary.data.byType.incident, {
        records: 1, unresolved: 0, eligibleResolved: 1, legacyOrIncomplete: 0,
    });
    assert.deepEqual(summary.data.byType.maintenance, {
        records: 0, unresolved: 0, eligibleResolved: 0, legacyOrIncomplete: 0,
    });
    assert.deepEqual(summary.data.unresolvedAge, {
        under24Hours: 0, from24To72Hours: 0, over72Hours: 0, unknownStart: 0,
    });
    assert.ok(Number.isFinite(summary.data.averageHoursToResolve));
    assert.match(summary.data.interpretation, /Not machine downtime/);
    assert.equal((await api('GET', '/analytics/maintenance?days=0', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/maintenance?days=366', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/maintenance')).status, 401);

    // Pre-existing records lack server-recorded events; do not backfill fictional times.
    await LogEntry.create({
        asset: assetId, author: registrationA.data._id,
        type: 'maintenance', status: 'resolved', title: 'Legacy fixture',
        description: 'Imported record without trustworthy event timestamps',
    });
    const legacySummary = await api('GET', '/analytics/maintenance?days=30', operator);
    assert.equal(legacySummary.status, 200);
    assert.equal(legacySummary.data.records, 2);
    assert.equal(legacySummary.data.eligibleResolved, 1);
    assert.equal(legacySummary.data.legacyOrIncomplete, 1);
    assert.equal(legacySummary.data.byType.maintenance.legacyOrIncomplete, 1);
    assert.equal(legacySummary.data.byType.incident.eligibleResolved, 1);
    // Workload is open cases *created in the window*, not all historic open items.
    const backlogAsset = await api('POST', '/assets', operator, {
        name: 'Synthetic Pump', serialNumber: 'BACKLOG-' + suffix,
        category: 'machinery', location: 'Fixture Lab',
    });
    assert.equal(backlogAsset.status, 201, JSON.stringify(backlogAsset.data));
    for (const type of ['incident', 'maintenance']) {
        const queued = await api('POST', '/logs', operator, {
            assetId: backlogAsset.data._id, type,
            title: 'Queued fixture ' + type, description: 'Synthetic open issue only',
        });
        assert.equal(queued.status, 201, JSON.stringify(queued.data));
    }
    const caseSummary = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(caseSummary.status, 200, JSON.stringify(caseSummary.data));
    assert.equal(caseSummary.data.totalOpenCases, 2);
    assert.equal(caseSummary.data.olderOpenCases, 0);
    assert.equal(caseSummary.data.undatedOpenCases, 0);
    assert.equal(caseSummary.data.futureDatedOpenCases, 0);
    assert.equal(caseSummary.data.missingAssetCases, 0);
    assert.equal(caseSummary.data.items.length, 1);
    assert.equal(caseSummary.data.items[0].assetId, backlogAsset.data._id);
    assert.equal(caseSummary.data.items[0].incidents, 1);
    assert.equal(caseSummary.data.items[0].maintenance, 1);
    assert.equal((await api('GET', '/analytics/equipment')).status, 401);
    assert.equal((await api('GET', '/analytics/equipment?days=0', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/equipment?days=366', operator)).status, 400);
    assert.equal((await api('GET', '/analytics/equipment?days=invalid', operator)).status, 400);
    await LogEntry.create({
        asset: new mongoose.Types.ObjectId(), author: registrationA.data._id,
        type: 'incident', status: 'open', title: 'Missing asset fixture',
        description: 'Reference does not have a matching asset',
    });
    const missingAssetSummary = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(missingAssetSummary.status, 200);
    assert.equal(missingAssetSummary.data.totalOpenCases, 3);
    assert.equal(missingAssetSummary.data.missingAssetCases, 1);
    // Test-only fixtures manipulate timestamps without exposing a REST write path.
    const olderCase = await LogEntry.create({
        asset: backlogAsset.data._id, author: registrationA.data._id,
        type: 'maintenance', status: 'open',
        title: 'Old unresolved work', description: 'Fixture created outside reporting window',
    });
    await LogEntry.collection.updateOne({ _id: olderCase._id }, {
        $set: { createdAt: new Date('2024-01-01T00:00:00.000Z') },
    });
    await LogEntry.collection.insertOne({
        asset: new mongoose.Types.ObjectId(backlogAsset.data._id),
        author: new mongoose.Types.ObjectId(registrationA.data._id),
        type: 'incident', status: 'open',
        title: 'Undated historical work',
        description: 'Missing creation timestamp for regression test',
    });
    const outsidePeriod = await api('GET', '/analytics/equipment?days=30', operator);
    assert.equal(outsidePeriod.status, 200, JSON.stringify(outsidePeriod.data));
    assert.equal(outsidePeriod.data.totalOpenCases, 3);
    assert.equal(outsidePeriod.data.olderOpenCases, 1);
    assert.equal(outsidePeriod.data.undatedOpenCases, 1);
    assert.equal(outsidePeriod.data.futureDatedOpenCases, 0);
    assert.equal(outsidePeriod.data.items[0].openCases, 2);
    assert.equal(missingAssetSummary.data.displayedOpenCases +
        missingAssetSummary.data.remainingOpenCases +
        missingAssetSummary.data.missingAssetCases,
        missingAssetSummary.data.totalOpenCases);

    const preventedDelete = await api('DELETE', '/assets/' + assetId, reviewer);
    assert.equal(preventedDelete.status, 409, JSON.stringify(preventedDelete.data));
    const retired = await api('PUT', '/assets/' + assetId, reviewer, { status: 'decommissioned' });
    assert.equal(retired.status, 200, JSON.stringify(retired.data));
    assert.equal(retired.data.statusHistory.length, 4);
    assert.equal(retired.data.statusHistory[3].from, 'operational');
    assert.equal((await api('PUT', '/assets/' + assetId, reviewer,
        { status: 'operational' })).status, 400);
    const afterRetirement = await api('POST', '/logs', operator, {
        assetId, type: 'operation', title: 'Invalid post-retirement operation',
        description: 'Prevent new operational events on retired equipment',
    });
    assert.equal(afterRetirement.status, 409, JSON.stringify(afterRetirement.data));
    // Prior history remains readable, including events recorded before decommissioning.
    const historicalLogs = await api('GET', '/logs?assetId=' + assetId, operator);
    assert.equal(historicalLogs.status, 200);
    assert.equal(historicalLogs.data.length, 2);



    const disposable = await api('POST', '/assets', reviewer, {
        name: 'Unused fixture', serialNumber: 'SPARE-' + suffix,
        category: 'equipment', location: 'Storage',
    });
    assert.equal(disposable.status, 201);
    assert.equal((await api('DELETE', '/assets/' + disposable.data._id, reviewer)).status, 200);
    assert.equal((await api('GET', '/assets/not-an-object-id', operator)).status, 400);
    assert.equal((await api('GET', '/logs?assetId=bad', operator)).status, 400);
    // Signing out atomically invalidates all bearer tokens for this account
    // across different login calls, including tokens that remain unexpired.
    assert.equal((await api('GET', '/assets', operator)).status, 200);
    assert.equal((await api('POST', '/auth/logout', null, {})).status, 401);
    const logout = await api('POST', '/auth/logout', operator, {});
    assert.equal(logout.status, 204);
    assert.equal((await api('GET', '/assets', operator)).status, 401);
    assert.equal((await api('GET', '/assets', caseInsensitiveLogin.data.token)).status, 401);
    assert.equal((await api('POST', '/auth/logout', operator, {})).status, 401);
    assert.equal((await api('GET', '/assets', reviewer)).status, 200,
        'Revoking operator tokens must not revoke another account');
    const relogin = await api('POST', '/auth/login', null, {
        email: emailA, password,
    });
    assert.equal(relogin.status, 200);
    assert.equal((await api('GET', '/assets', relogin.data.token)).status, 200);

    // Operator and unauthenticated callers cannot enumerate security events.
    assert.equal((await api('GET', '/audit', relogin.data.token)).status, 403);
    assert.equal((await api('GET', '/audit')).status, 401);

    // Asynchronous post-response audit persistence must be treated as
    // eventually observed, not transactionally committed with the write.
    let auditRows = [];
    for (let attempt = 0; attempt < 50; attempt++) {
        auditRows = await AuditEvent.find().lean();
        if (auditRows.some(event => event.action === 'auth.logout' &&
                event.statusCode === 204) &&
            auditRows.some(event => event.action === 'asset.create' &&
                event.resourceId?.toString() === assetId) &&
            auditRows.some(event => event.action === 'log.update' &&
                event.statusCode === 200) &&
            auditRows.some(event => event.action === 'auth.login' &&
                event.statusCode === 401)) break;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(auditRows.length >= 9, 'Expected minimal audit event coverage');
    for (const action of ['auth.register', 'auth.login', 'auth.logout',
        'asset.create', 'asset.update', 'asset.delete', 'log.create', 'log.update']) {
        assert.ok(auditRows.some(event => event.action === action), action);
    }
    assert.ok(auditRows.some(event => event.action === 'auth.login' &&
        event.outcome === 'denied' && !event.actorId));
    assert.ok(auditRows.some(event => event.action === 'asset.update' &&
        event.outcome === 'denied' && event.statusCode === 403));
    const logoutEvent = auditRows.find(event => event.action === 'auth.logout' &&
        event.statusCode === 204);
    assert.equal(logoutEvent.actorId.toString(), registrationA.data._id);
    for (const event of auditRows) {
        const content = JSON.stringify(event);
        assert.equal(content.includes(password), false);
        assert.equal(content.includes(emailA), false);
        assert.equal(content.includes(emailB), false);
        assert.equal(content.includes(operator), false);
        for (const key of ['body', 'token', 'email', 'password', 'remoteAddress']) {
            assert.equal(Object.prototype.hasOwnProperty.call(event, key), false);
        }
    }

    // Only supervisors/admins can inspect the append-only, bounded history.
    const first = await api('GET', '/audit?limit=2', reviewer);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.items.length, 2);
    assert.match(first.data.nextCursor, /^[0-9a-f]{24}$/);
    const nextPage = await api('GET', '/audit?limit=2&cursor=' +
        first.data.nextCursor, reviewer);
    assert.equal(nextPage.status, 200);
    assert.equal(nextPage.data.items.length, 2);
    assert.ok(!nextPage.data.items.some(row =>
        first.data.items.some(previous => previous._id === row._id)));
    for (const invalidQuery of ['limit=0', 'limit=51', 'limit=x',
        'cursor=invalid', 'sort=password', 'limit%5B%24gt%5D=1']) {
        assert.equal((await api('GET', '/audit?' + invalidQuery, reviewer)).status, 400,
            invalidQuery);
    }
    const noWrite = await fetch(base + '/audit', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + reviewer, 'Content-Type': 'application/json' },
        body: '{}',
    });
    assert.equal(noWrite.status, 404, 'Audit list must have no creation endpoint');


    // Forged/legacy JWTs with no expected role, version or audience fail
    // even if signed with this disposable test secret.
    const jwt = require('jsonwebtoken');
    const legacy = jwt.sign({ id: registrationA.data._id },
        process.env.JWT_SECRET, { expiresIn: '1h' });
    assert.equal((await api('GET', '/assets', legacy)).status, 401);
    const wrongAudience = jwt.sign({
        id: registrationA.data._id, ver: 1, role: 'operator',
    }, process.env.JWT_SECRET, {
        expiresIn: '1h', issuer: 'plantlog-local-demo', audience: 'another-api',
    });
    assert.equal((await api('GET', '/assets', wrongAudience)).status, 401);


    // An independent synthetic fixture tests conditional writes without
    // changing the incident counts/assertions used earlier in this suite.
    const revisionAsset = await api('POST', '/assets', relogin.data.token, {
        name: 'Synthetic revision comparison', serialNumber: 'CAS-' + suffix,
        category: 'equipment', location: 'Test-only bay',
    });
    assert.equal(revisionAsset.status, 201, JSON.stringify(revisionAsset.data));
    const revisionAssetId = revisionAsset.data._id;
    const revGet = await fetch(base + '/assets/' + revisionAssetId, {
        headers: { Authorization: 'Bearer ' + reviewer },
    });
    assert.equal(revGet.headers.get('etag'), '"0"');
    const firstVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'maintenance' }, { 'If-Match': '"0"' });
    assert.equal(firstVersion.status, 200, JSON.stringify(firstVersion.data));
    assert.equal(firstVersion.data.__v, 1);
    const staleVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'operational' }, { 'If-Match': '"0"' });
    assert.equal(staleVersion.status, 412);
    const invalidRevision = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { location: 'Poisoned' }, { 'If-Match': 'W/"1"' });
    assert.equal(invalidRevision.status, 400);
    const currentVersion = await api('PUT', '/assets/' + revisionAssetId, reviewer,
        { status: 'operational' }, { 'If-Match': '"1"' });
    assert.equal(currentVersion.status, 200);
    assert.equal(currentVersion.data.__v, 2);
    assert.equal(currentVersion.data.statusHistory.length, 3);
    const revisionLog = await api('POST', '/logs', relogin.data.token, {
        assetId: revisionAssetId, type: 'incident', title: 'Synthetic CAS comparison',
        description: 'No physical event, only an ephemeral concurrency test',
    });
    assert.equal(revisionLog.status, 201, JSON.stringify(revisionLog.data));
    const revisionLogId = revisionLog.data._id;
    assert.equal(revisionLog.data.__v, 0);
    const acknowledgedCas = await api('PUT', '/logs/' + revisionLogId, relogin.data.token,
        { status: 'acknowledged' }, { 'If-Match': '"0"' });
    assert.equal(acknowledgedCas.status, 200, JSON.stringify(acknowledgedCas.data));
    assert.equal(acknowledgedCas.data.__v, 1);
    assert.equal((await api('PUT', '/logs/' + revisionLogId, relogin.data.token,
        { status: 'resolved' }, { 'If-Match': '"0"' })).status, 412);

    // Both requests are based on exactly the same verified revision.
    // At most one mutation may win; whether the loser sees 409 (DB CAS)
    // or 412 (HTTP precondition) depends on scheduling.
    const rivals = await Promise.all([
        api('PUT', '/logs/' + revisionLogId, relogin.data.token,
            { status: 'in_progress' }, { 'If-Match': '"1"' }),
        api('PUT', '/logs/' + revisionLogId, relogin.data.token,
            { status: 'resolved' }, { 'If-Match': '"1"' }),
    ]);
    assert.equal(rivals.filter(x => x.status === 200).length, 1,
        JSON.stringify(rivals.map(x => x.status)));
    assert.ok(rivals.every(x => [200, 409, 412].includes(x.status)));
    const afterRace = await api('GET', '/logs?assetId=' + revisionAssetId, reviewer);
    assert.equal(afterRace.status, 200);
    const persisted = afterRace.data.find(x => x._id === revisionLogId);
    assert.equal(persisted.__v, 2, 'Only one revision can be committed');
    assert.equal(persisted.statusHistory.length, 3,
        'A rejected contender must not append an extra lifecycle event');
    assert.ok(['in_progress', 'resolved'].includes(persisted.status));

});
