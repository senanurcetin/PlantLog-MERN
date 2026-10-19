const { test } = require('node:test');
const assert = require('node:assert/strict');
const { defaultDemoOrigins, resolveAllowedOrigins } = require('../dist/utils/corsPolicy.js');

test('local demo origins are bounded and do not accept wildcards', () => {
    const resolved = resolveAllowedOrigins(undefined, 'production');
    assert.deepEqual(resolved, [...defaultDemoOrigins]);
    assert.ok(resolved.includes('http://localhost:5173'));
    assert.ok(!resolved.includes('*'));
});

test('custom origin override is explicit and deduplicated', () => {
    assert.deepEqual(
        resolveAllowedOrigins('https://demo.example.org, https://demo.example.org, http://localhost:8081', 'production'),
        ['https://demo.example.org', 'http://localhost:8081'],
    );
});

test('production disallows non-TLS remote browser origins', () => {
    assert.throws(() => resolveAllowedOrigins('http://remote.example', 'production'), /HTTPS/);
    assert.deepEqual(resolveAllowedOrigins('http://remote.example', 'development'), ['http://remote.example']);
    assert.deepEqual(resolveAllowedOrigins('http://127.0.0.1:8081', 'production'), ['http://127.0.0.1:8081']);
});

test('invalid, credentialed, path-bearing, and wildcard origins fail closed', () => {
    for (const candidate of [
        '', '*', 'null', 'ftp://example.com', 'https://example.com/path',
        'https://example.com/', 'https://name:secret@example.com',
        'https://example.com?x=1', 'https://example.com#frag',
        'https://example.com:443', 'https://example.com,,https://other.example',
        'https://example.com,'.repeat(17),
    ]) assert.throws(() => resolveAllowedOrigins(candidate, 'production'));
});
