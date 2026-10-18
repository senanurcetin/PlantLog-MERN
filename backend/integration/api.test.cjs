const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const app = require('../dist/app.js').default;
const User = require('../dist/models/User.js').default;

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
    const filtered = await api('GET', '/logs?assetId=' + assetId, operator);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.length, 1);
    assert.equal((await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' })).status, 403);
    assert.equal((await api('PUT', '/logs/' + logId, operator, { status: 'acknowledged' })).status, 200);

    // Trusted fixture elevation, never exposed as a public HTTP endpoint.
    await User.updateOne({ email: emailB }, { $set: { role: 'supervisor' } });
    const elevated = await api('PUT', '/assets/' + assetId, reviewer, { status: 'maintenance' });
    assert.equal(elevated.status, 200, JSON.stringify(elevated.data));
    assert.equal(elevated.data.status, 'maintenance');
    assert.equal((await api('PUT', '/logs/' + logId, reviewer, { status: 'resolved' })).status, 200);
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
