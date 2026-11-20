const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const { createSharedAuthRateLimit } = require('../dist/middlewares/authRateLimit.js');
const AuthRateLimit = require('../dist/models/AuthRateLimit.js').default;

// Two separate Express apps = two API instances; MongoDB is the only shared state.
test('login limit holds across two API instances through MongoDB', { timeout: 60000 }, async (t) => {
    const database = 'plantlog_ratelimit_' + randomUUID().replace(/-/g, '');
    await mongoose.connect('mongodb://127.0.0.1:27017/' + database, { serverSelectionTimeoutMS: 20000 });
    t.after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await AuthRateLimit.init();
    const indexes = await AuthRateLimit.collection.indexes();
    assert.equal(indexes.find((i) => i.key && i.key.resetAt === 1)?.expireAfterSeconds, 0, 'TTL index bounds the store');

    const servers = [];
    const bases = [];
    for (let i = 0; i < 2; i++) {
        const app = express();
        app.post('/login', createSharedAuthRateLimit('login', 3, 60000), (req, res) => res.json({ ok: true }));
        const server = app.listen(0, '127.0.0.1');
        await new Promise((resolve) => server.once('listening', resolve));
        servers.push(server);
        bases.push('http://127.0.0.1:' + server.address().port);
    }
    t.after(() => Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve)))));

    const statuses = [];
    for (const base of [bases[0], bases[1], bases[0], bases[1], bases[0]]) {
        // A spoofed header must not create a new key: no proxy is trusted here.
        const res = await fetch(base + '/login', { method: 'POST', headers: { 'X-Forwarded-For': randomUUID() } });
        statuses.push(res.status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
    const docs = await AuthRateLimit.find({}).lean();
    assert.equal(docs.length, 1);
    assert.equal(docs[0].key, 'login:127.0.0.1');
    assert.equal(docs[0].count, 5);

    // Concurrent attempts from both instances are counted atomically.
    await AuthRateLimit.deleteMany({});
    const burst = await Promise.all(Array.from({ length: 10 }, (_, i) =>
        fetch(bases[i % 2] + '/login', { method: 'POST' }).then((r) => r.status)));
    assert.equal(burst.filter((s) => s === 200).length, 3);
    assert.equal(burst.filter((s) => s === 429).length, 7);
});
