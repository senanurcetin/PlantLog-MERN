const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createSharedAuthRateLimit } = require('../dist/middlewares/authRateLimit.js');
const { resolveTrustProxyHops } = require('../dist/utils/trustProxy.js');

// In-memory stand-in for the MongoDB store: ONE store object shared by two
// limiter instances is exactly what two API processes see through MongoDB.
const sharedStore = () => {
    const rows = new Map();
    return {
        rows,
        async hit(key, windowMs, now) {
            const row = rows.get(key);
            if (!row || row.resetAt <= now) {
                const fresh = { count: 1, resetAt: now + windowMs };
                rows.set(key, fresh);
                return { ...fresh };
            }
            row.count += 1;
            return { ...row };
        },
    };
};

const call = (limiter, request) => new Promise((resolve) => {
    const result = { code: 200, headers: {}, passed: false };
    const response = {
        setHeader(name, value) { result.headers[name] = value; },
        status(code) { result.code = code; return this; },
        json() { resolve(result); return this; },
    };
    limiter(request, response, () => { result.passed = true; resolve(result); });
});

test('the limit holds across two app instances that share one store', async () => {
    let current = 1000;
    const store = sharedStore();
    const opts = { store, useStore: () => true, now: () => current };
    const instanceA = createSharedAuthRateLimit('login', 3, 60000, opts);
    const instanceB = createSharedAuthRateLimit('login', 3, 60000, opts);
    const request = { ip: '203.0.113.7', socket: { remoteAddress: '203.0.113.7' } };
    const outcomes = [];
    for (const limiter of [instanceA, instanceB, instanceA, instanceB]) {
        outcomes.push((await call(limiter, request)).passed);
    }
    assert.deepEqual(outcomes, [true, true, true, false]);
    const blocked = await call(instanceA, request);
    assert.equal(blocked.code, 429);
    assert.equal(blocked.headers['Retry-After'], '60');
    current += 60000;
    assert.equal((await call(instanceB, request)).passed, true, 'a new window starts after expiry');
});

test('register and login are counted separately', async () => {
    const store = sharedStore();
    const opts = { store, useStore: () => true };
    const request = { ip: '198.51.100.2', socket: {} };
    assert.equal((await call(createSharedAuthRateLimit('register', 1, 1000, opts), request)).passed, true);
    assert.equal((await call(createSharedAuthRateLimit('login', 1, 1000, opts), request)).passed, true);
    assert.deepEqual([...store.rows.keys()].sort(), ['login:198.51.100.2', 'register:198.51.100.2']);
});

test('without a connected store the bounded local limiter still applies', async () => {
    const failing = { async hit() { throw new Error('store down'); } };
    const offline = createSharedAuthRateLimit('login', 1, 1000, { store: failing, useStore: () => false });
    const request = { socket: { remoteAddress: '127.0.0.1' } };
    assert.equal((await call(offline, request)).passed, true);
    assert.equal((await call(offline, request)).code, 429);
    const broken = createSharedAuthRateLimit('login', 1, 1000, { store: failing, useStore: () => true });
    assert.equal((await call(broken, request)).passed, true);
    assert.equal((await call(broken, request)).code, 429, 'a store error never fails open');
});

const serve = async (hops) => {
    const app = express();
    app.set('trust proxy', hops || false);
    const store = sharedStore();
    app.post('/login', createSharedAuthRateLimit('login', 1, 60000, { store, useStore: () => true }),
        (req, res) => res.json({ ok: true }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    return { server, store, base: `http://127.0.0.1:${server.address().port}` };
};

test('a spoofed X-Forwarded-For is ignored when no proxy is trusted', async () => {
    const { server, store, base } = await serve(resolveTrustProxyHops(''));
    try {
        const first = await fetch(base + '/login', { method: 'POST', headers: { 'X-Forwarded-For': '10.0.0.1' } });
        const second = await fetch(base + '/login', { method: 'POST', headers: { 'X-Forwarded-For': '10.0.0.2' } });
        assert.equal(first.status, 200);
        assert.equal(second.status, 429, 'changing the header must not reset the count');
        assert.deepEqual([...store.rows.keys()], ['login:127.0.0.1']);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('with one trusted hop the forwarded client address is the key', async () => {
    const { server, store, base } = await serve(resolveTrustProxyHops('1'));
    try {
        const a = await fetch(base + '/login', { method: 'POST', headers: { 'X-Forwarded-For': '192.0.2.10' } });
        const b = await fetch(base + '/login', { method: 'POST', headers: { 'X-Forwarded-For': '192.0.2.11' } });
        assert.equal(a.status, 200);
        assert.equal(b.status, 200);
        assert.deepEqual([...store.rows.keys()].sort(), ['login:192.0.2.10', 'login:192.0.2.11']);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('TRUST_PROXY_HOPS accepts only a small whole number', () => {
    assert.equal(resolveTrustProxyHops(undefined), 0);
    assert.equal(resolveTrustProxyHops(' 2 '), 2);
    for (const bad of ['true', '-1', '1.5', '11', 'loopback']) {
        assert.throws(() => resolveTrustProxyHops(bad), /TRUST_PROXY_HOPS/);
    }
});
