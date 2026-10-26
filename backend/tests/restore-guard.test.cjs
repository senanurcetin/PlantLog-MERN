const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('restore drill is disabled outside explicitly selected CI service container', () => {
    const script = path.resolve(__dirname, '../scripts/verify-backup-restore.cjs');
    for (const props of [
        { CI: 'false', PLANTLOG_CI_MONGO_CONTAINER_ID: '1234567890ab' },
        { CI: 'true', PLANTLOG_CI_MONGO_CONTAINER_ID: 'not-a-container-id' },
        { CI: 'true', PLANTLOG_CI_MONGO_CONTAINER_ID: '' },
    ]) {
        const result = spawnSync(process.execPath, [script], {
            encoding: 'utf8', timeout: 10000,
            env: { ...process.env, ...props },
        });
        assert.equal(result.status, 2);
        assert.match(result.stderr, /ephemeral GitHub CI MongoDB service/);
    }
});
