const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const { resolveApiBindHost } = require('../dist/utils/runtimePosture.js');
const { evaluateReadiness, isDraining, beginShutdown } =
    require('../dist/utils/readiness.js');

test('API defaults to loopback independently of NODE_ENV', () => {
    assert.equal(resolveApiBindHost(undefined, undefined), '127.0.0.1');
    assert.equal(resolveApiBindHost('localhost', undefined), '127.0.0.1');
    assert.equal(resolveApiBindHost('127.0.0.1', undefined), '127.0.0.1');
    assert.equal(resolveApiBindHost('::1', undefined), '::1');
    assert.equal(resolveApiBindHost('127.0.0.1', 'true'), '127.0.0.1');
});
test('non-loopback API listener must be explicitly scoped to private Docker networking', () => {
    for (const [host, optIn] of [
        ['0.0.0.0', undefined], ['0.0.0.0', 'false'],
        ['192.0.2.1', 'true'], ['example.org', 'true'],
        [' 0.0.0.0 ', 'true'], ['::', 'true'],
    ]) {
        assert.throws(() => resolveApiBindHost(host, optIn), /External API bind prohibited/);
    }
    assert.equal(resolveApiBindHost('0.0.0.0', 'true'), '0.0.0.0');
});
test('liveness is independent; readiness fails closed on disconnect and shutdown', () => {
    assert.deepEqual(evaluateReadiness(0, false), { status: 'unavailable', httpStatus: 503 });
    assert.deepEqual(evaluateReadiness(2, false), { status: 'unavailable', httpStatus: 503 });
    assert.deepEqual(evaluateReadiness(3, false), { status: 'unavailable', httpStatus: 503 });
    assert.deepEqual(evaluateReadiness(1, false), { status: 'ready', httpStatus: 200 });
    assert.deepEqual(evaluateReadiness(1, true), { status: 'unavailable', httpStatus: 503 });
    assert.equal(isDraining(), false);
    beginShutdown();
    assert.equal(isDraining(), true);
});
test('local Compose does not publish API, database or frontend on public interfaces', () => {
    const compose = readFileSync(path.resolve(__dirname, '../../docker-compose.yml'), 'utf8');
    for (const mapping of [
        '127.0.0.1:27017:27017',
        '127.0.0.1:5000:5000',
        '127.0.0.1:8081:80',
    ]) assert.ok(compose.includes(mapping), 'Missing loopback binding ' + mapping);
    assert.match(compose, /API_BIND_HOST=0\.0\.0\.0/);
    assert.match(compose, /PLANTLOG_INTERNAL_CONTAINER_NETWORK=true/);
    assert.match(compose, /condition: service_healthy/);
    assert.match(compose, /\/api\/health\/ready/);
});
