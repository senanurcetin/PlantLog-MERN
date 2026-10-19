const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const app = require('../dist/app.js').default;
const User = require('../dist/models/User.js').default;
const LogEntry = require('../dist/models/LogEntry.js').default;

// Always create a fresh local test-only database. Never accept a production URI.
test('authenticated registry lifecycle with MongoDB', { timeout: 60000 }, async (t) => {
    const database = 'plantlog_integration_' + randomUUID().replace(/-/g, '');
    const mongoUri = 'mongodb://127.0.0.1:27017/' + database;
    process.env.JWT_SECRET = 'test-only-unique-local-jwt-secret-for-ci-tests-2026';

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 20000 });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));

    t.after(async () => {
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    const base = 'http://127.0.0.1:' + server.address().port + '/api';
    const api = async (method, path, token, body) => {
        const result = await fetch(base + path, {
            method,
            headers: {
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(body ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await result.json();
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

    const registrationA = await api('POST', '/auth/register', null, {
        name: 'Demo Operator', email: emailA, password,
    });
    assert.equal(registrationA.status, 201, JSON.stringify(registrationA.data));
    assert.equal(registrationA.data.role, 'operator');
    const operator = registrationA.data.token;

    const registrationB = await api('POST', '/auth/register', null, {
        name: 'Demo Reviewer', email: emailB, password,
    });
    assert.equal(registrationB.status, 201, JSON.stringify(registrationB.data));
    const reviewer = registrationB.data.token;

    assert.equal((await api('POST', '/auth/login', null, { email: emailA, password: 'wrong' })).status, 401);
    assert.equal((await api('POST', '/auth/login', null, { email: emailA, password })).status, 200);
    assert.equal((await api('GET', '/assets')).status, 401);

    const createdAsset = await api('POST', '/assets', operator, {
        name: 'Synthetic Conveyor', serialNumber: 'DEMO-' + suffix,
        category: 'equipment', status: 'operational', location: 'Fixture Bay',
    });
    assert.equal(createdAsset.status, 201, JSON.stringify(createdAsset.data));
    const assetId = createdAsset.data._id;
    assert.equal((await api('GET', '/assets/' + assetId, operator)).status, 200);
    assert.equal((await api('PUT', '/assets/' + assetId, operator, { status: 'maintenance' })).status, 403);
    assert.equal((await api('DELETE', '/assets/' + assetId, operator)).status, 403);

    const createdLog = await api('POST', '/logs', operator, {
        assetId, type: 'incident', title: 'Synthetic belt fault',
        description: 'No actual equipment affected; only a test fixture.', status: 'open',
    });
    assert.equal(createdLog.status, 201, JSON.stringify(createdLog.data));
    const logId = createdLog.data._id;
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
    const working = await api('PUT', '/logs/' + logId, operator, { status: 'in_progress' });
    assert.equal(working.status, 200, JSON.stringify(working.data));
    assert.equal(working.data.statusHistory.length, 3);
    assert.ok(working.data.workStartedAt);

    // Trusted fixture elevation, never exposed as a public HTTP endpoint.
    await User.updateOne({ email: emailB }, { $set: { role: 'supervisor' } });
    const elevated = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(elevated.status, 200, JSON.stringify(elevated.data));
    assert.equal(elevated.data.status, 'maintenance');
    const resolved = await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' });
    assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
    assert.equal(resolved.data.statusHistory.length, 4);
    assert.ok(resolved.data.resolvedAt);
    assert.equal(resolved.data.statusHistory[3].to, 'resolved');
    assert.equal((await api('PUT', '/logs/' + logId, reviewer, { status: 'open' })).status, 400);

    const summary = await api('GET', '/analytics/maintenance?days=30', operator);
    assert.equal(summary.status, 200, JSON.stringify(summary.data));
    assert.equal(summary.data.records, 1);
    assert.equal(summary.data.eligibleResolved, 1);
    assert.equal(summary.data.legacyOrIncomplete, 0);
    assert.equal(summary.data.unresolved, 0);
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
    const preventedDelete = await api('DELETE', '/assets/' + assetId, reviewer);
    assert.equal(preventedDelete.status, 409, JSON.stringify(preventedDelete.data));

    const disposable = await api('POST', '/assets', reviewer, {
        name: 'Unused fixture', serialNumber: 'SPARE-' + suffix,
        category: 'equipment', location: 'Storage',
    });
    assert.equal(disposable.status, 201);
    assert.equal((await api('DELETE', '/assets/' + disposable.data._id, reviewer)).status, 200);
    assert.equal((await api('GET', '/assets/not-an-object-id', operator)).status, 400);
    assert.equal((await api('GET', '/logs?assetId=bad', operator)).status, 400);
});
