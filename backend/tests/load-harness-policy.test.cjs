const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const script = path.resolve(__dirname, '../scripts/verify-synthetic-load.cjs');

test('load harness refuses execution without ephemeral CI MongoDB identity', () => {
    for (const vars of [
        { CI: 'false', PLANTLOG_CI_MONGO_CONTAINER_ID: '0123456789abcdef' },
        { CI: 'true', PLANTLOG_CI_MONGO_CONTAINER_ID: '' },
        { CI: 'true', PLANTLOG_CI_MONGO_CONTAINER_ID: '127.0.0.1:27017' },
    ]) {
        const p = spawnSync(process.execPath, [script], {
            env: { ...process.env, ...vars }, encoding: 'utf8', timeout: 7000,
        });
        assert.equal(p.status, 2);
        assert.match(p.stderr, /requires a GitHub CI MongoDB service/);
    }
});

test('load evidence has fixed, loopback-only scope and bounded request mix', () => {
    const src = readFileSync(script, 'utf8');
    assert.match(src, /const concurrency = 8/);
    assert.match(src, /length: 30/);
    assert.match(src, /127\.0\.0\.1:27017/);
    assert.match(src, /app\.listen\(0, '127\.0\.0\.1'\)/);
    assert.match(src, /productionLoadCapacityVerified: false/);
    assert.match(src, /fixedLatencySloEnforced: false/);
    assert.doesNotMatch(src, /process\.env\.(?:TARGET_URL|BASE_URL|MONGO_URI)/);
});
