const test = require('node:test');
const assert = require('node:assert/strict');
const fixture = require('../src/demo/fixture.json');

test('demo dataset is explicitly identified as synthetic', () => {
    assert.match(fixture.context.dataset, /synthetic/i);
    assert.match(fixture.context.notice, /fictional/i);
    assert.match(fixture.context.notice, /no operational data/i);
});
test('asset identifiers, serial numbers, and log identifiers are unique', () => {
    for (const [values, label] of [
        [fixture.assets.map(a => a.id), 'asset ids'],
        [fixture.assets.map(a => a.serialNumber), 'serial numbers'],
        [fixture.logs.map(l => l.id), 'log ids']]) {
        assert.equal(new Set(values).size, values.length, label);
    }
});
test('asset records have allowed status values and required fields', () => {
    const valid = new Set(['operational', 'maintenance', 'decommissioned']);
    assert.ok(fixture.assets.length >= 6);
    for (const asset of fixture.assets) {
        assert.ok(asset.id && asset.name && asset.serialNumber && asset.location);
        assert.ok(asset.serialNumber.startsWith('DEMO-'));
        assert.ok(valid.has(asset.status), asset.status);
    }
});
test('log references are valid and timestamps are parseable', () => {
    const knownAssets = new Set(fixture.assets.map(a => a.id));
    const validTypes = new Set(['operation', 'maintenance', 'incident', 'inspection']);
    const validStatuses = new Set(['open', 'acknowledged', 'resolved']);
    assert.ok(fixture.logs.length >= 10);
    for (const log of fixture.logs) {
        assert.ok(knownAssets.has(log.assetId), log.id);
        assert.ok(validTypes.has(log.type), log.type);
        assert.ok(validStatuses.has(log.status), log.status);
        assert.ok(log.title && log.description && log.reportedBy);
        assert.ok(Number.isFinite(Date.parse(log.date)), log.date);
        assert.ok(Date.parse(log.date) <= Date.parse(fixture.context.snapshot + 'T23:59:59Z'));
    }
});
test('all status and type categories are represented for filtering', () => {
    assert.deepEqual(new Set(fixture.assets.map(a => a.status)),
        new Set(['operational', 'maintenance', 'decommissioned']));
    assert.deepEqual(new Set(fixture.logs.map(l => l.type)),
        new Set(['operation', 'maintenance', 'incident', 'inspection']));
});

test('illustrative status histories are internally ordered and agree with current status', () => {
    const withEvents = fixture.logs.filter(log => log.statusHistory.length > 0);
    assert.ok(withEvents.length >= 3);
    for (const log of withEvents) {
        assert.equal(log.statusHistory[0].to, 'open');
        assert.equal(log.statusHistory[0].changedAt, log.date);
        assert.equal(log.statusHistory[log.statusHistory.length - 1].to, log.status);
        for (let i = 1; i < log.statusHistory.length; i++) {
            const previous = log.statusHistory[i - 1];
            const current = log.statusHistory[i];
            assert.equal(current.from, previous.to);
            assert.ok(Date.parse(current.changedAt) >= Date.parse(previous.changedAt));
            assert.ok(Date.parse(current.changedAt) <= Date.parse(fixture.context.snapshot + 'T23:59:59Z'));
        }
    }
});
