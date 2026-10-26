/**
 * Pre-production, bounded synthetic HTTP workload + readiness recovery probe.
 * Strict opt-in to an ephemeral GitHub Actions MongoDB service. No arbitrary
 * hosts, ports, URLs, DB names, tokens or account data may be supplied.
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const id = process.env.PLANTLOG_CI_MONGO_CONTAINER_ID || '';
if (process.env.CI !== 'true' || !/^[a-f0-9]{12,64}$/.test(id)) {
    process.stderr.write('Synthetic load check requires a GitHub CI MongoDB service.\n');
    process.exit(2);
}

const app = require('../dist/app.js').default;
const User = require('../dist/models/User.js').default;
const Asset = require('../dist/models/Asset.js').default;
const LogEntry = require('../dist/models/LogEntry.js').default;
const generateToken = require('../dist/utils/generateToken.js').default;
const concurrency = 8;
const routes = [
    { name: 'assets', url: '/api/assets', expected: 200, authenticated: true },
    { name: 'logs', url: '/api/logs', expected: 200, authenticated: true },
    { name: 'maintenance', url: '/api/analytics/maintenance?days=30', expected: 200, authenticated: true },
    { name: 'equipment', url: '/api/analytics/equipment?days=30', expected: 200, authenticated: true },
    { name: 'unauthorized', url: '/api/assets', expected: 401, authenticated: false },
];

const percentile = (sorted, p) => {
    assert.ok(sorted.length, 'Cannot calculate percentile on empty samples');
    const idx = Math.max(0, Math.ceil(sorted.length * p / 100) - 1);
    return Math.round(sorted[idx] * 100) / 100;
};
const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
        count: values.length,
        minMs: percentile(sorted, 0),
        p50Ms: percentile(sorted, 50),
        p95Ms: percentile(sorted, 95),
        p99Ms: percentile(sorted, 99),
        maxMs: percentile(sorted, 100),
    };
};

async function main() {
    const suffix = randomUUID().replaceAll('-', '');
    const dbName = 'plantlog_load_ci_' + suffix;
    const uri = 'mongodb://127.0.0.1:27017/' + dbName;
    const previousJwt = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'synthetic-ci-benchmark-only-signing-secret-2026-not-a-real-key';
    let server;
    let connected = false;
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
        connected = true;
        const user = await User.create({
            name: 'Synthetic benchmark operator',
            email: 'load-' + suffix + '@example.com',
            password: 'ci-only-unusable-password-hash',
            role: 'operator',
        });
        const assets = await Asset.create(Array.from({ length: 6 }, (_, n) => ({
            name: 'Synthetic station ' + n,
            serialNumber: 'LOAD-' + suffix + '-' + n,
            category: 'equipment',
            status: 'operational',
            location: 'CI-only zone',
            createdBy: user._id,
        })));
        const now = new Date();
        await LogEntry.create(Array.from({ length: 18 }, (_, n) => ({
            asset: assets[n % assets.length]._id,
            author: user._id,
            type: n % 3 === 0 ? 'maintenance' : 'incident',
            title: 'Synthetic maintenance ' + n,
            description: 'Generated in disposable CI MongoDB; no physical machinery',
            status: 'open',
            reportedAt: now,
        })));
        const token = generateToken(user.id, user.tokenVersion, user.role);
        server = app.listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        const base = 'http://127.0.0.1:' + server.address().port;

        const probe = async (url, headers = {}) => {
            const response = await fetch(base + url, {
                headers, signal: AbortSignal.timeout(15000),
            });
            const body = await response.json();
            return { status: response.status, body, cache: response.headers.get('cache-control') };
        };
        const auth = { Authorization: 'Bearer ' + token };
        const warm = await probe('/api/health/ready');
        assert.equal(warm.status, 200);
        assert.equal(warm.cache, 'no-store');
        assert.equal((await probe('/api/assets', auth)).status, 200);

        // Fixed and bounded: 30 requests per endpoint, maximum 8 concurrent
        // in-flight requests, no warm-up claims or hard latency SLO.
        const tasks = routes.flatMap(route => Array.from({ length: 30 }, () => route));
        const timings = Object.fromEntries(routes.map(r => [r.name, []]));
        const statusCounts = Object.fromEntries(routes.map(r => [r.name, {}]));
        const started = performance.now();
        let cursor = 0;
        const worker = async () => {
            while (cursor < tasks.length) {
                const task = tasks[cursor++];
                const start = performance.now();
                const result = await probe(task.url, task.authenticated ? auth : {});
                const duration = performance.now() - start;
                timings[task.name].push(duration);
                const bucket = statusCounts[task.name];
                bucket[result.status] = (bucket[result.status] || 0) + 1;
                assert.equal(result.status, task.expected, task.name + ' unexpected HTTP outcome');
                if (task.authenticated) assert.ok(result.body !== null && typeof result.body === 'object');
                else assert.equal(result.body.token, undefined);
            }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
        const elapsedMs = performance.now() - started;
        const total = tasks.length;
        assert.equal(Object.values(timings).reduce((n, x) => n + x.length, 0), total);
        for (const route of routes) assert.equal(timings[route.name].length, 30);

        // Inject one local MongoDB connection interruption *after* workload.
        // No writes are attempted during outage: this verifies a signal,
        // not failover, buffering behavior, or uninterrupted availability.
        await mongoose.disconnect();
        connected = false;
        const unavailable = await probe('/api/health/ready');
        const live = await probe('/api/health/live');
        assert.equal(unavailable.status, 503);
        assert.equal(unavailable.body.status, 'unavailable');
        assert.equal(unavailable.cache, 'no-store');
        assert.equal(live.status, 200);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
        connected = true;
        const recovered = await probe('/api/health/ready');
        assert.equal(recovered.status, 200);
        assert.equal((await probe('/api/assets', auth)).status, 200);

        const report = {
            schemaVersion: 1,
            status: 'PASS',
            scope: 'Ephemeral localhost MongoDB and Express CI process only',
            dataset: { synthetic: true, assets: 6, logEntries: 18, users: 1 },
            workload: {
                requests: total,
                maxConcurrency: concurrency,
                requestsPerRoute: 30,
                elapsedMs: Math.round(elapsedMs * 100) / 100,
                observedRps: Math.round(total / (elapsedMs / 1000) * 100) / 100,
                routeMetrics: Object.fromEntries(routes.map(r => [r.name, {
                    expectedHttpStatus: r.expected,
                    statuses: statusCounts[r.name],
                    ...summarize(timings[r.name]),
                }])),
            },
            faultExercise: {
                databaseDisconnectObserved503: true,
                livenessRemained200: true,
                databaseReconnectObserved200: true,
                authenticatedReadAfterReconnect: true,
            },
            evaluation: {
                requestCorrectnessEnforced: true,
                fixedLatencySloEnforced: false,
                productionLoadCapacityVerified: false,
                simultaneousDatabaseWritesTestedHere: false,
                multiInstanceFaultToleranceVerified: false,
                realFailureInjectionVerified: false,
            },
        };
        const dir = path.join(__dirname, '../test-artifacts');
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, 'synthetic-load-resilience.json'), JSON.stringify(report, null, 2) + '\n');
        process.stdout.write('Synthetic load/resilience PASS: 150 bounded requests, DB readiness 503 -> 200\n');
    } finally {
        if (server) await new Promise((resolve, reject) =>
            server.close(err => err ? reject(err) : resolve()));
        if (!connected) {
            try { await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 }); connected = true; }
            catch { process.stderr.write('Synthetic load cleanup could not reconnect\n'); }
        }
        if (connected) {
            try { await mongoose.connection.dropDatabase(); }
            catch { process.stderr.write('Synthetic load database cleanup failed\n'); }
            await mongoose.disconnect();
        }
        if (previousJwt === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = previousJwt;
    }
}

main().catch(() => {
    // Do not print stack/URI/token; CI stores only sanitized failure marker.
    process.stderr.write('Synthetic workload validation FAILED; see checked-in test contract\n');
    process.exitCode = 1;
});
