const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarizeEquipmentCases } = require('../dist/utils/equipmentCases.js');
const now = new Date('2026-10-19T12:00:00Z');
const sample = (asset, type, status = 'open', hours = 3) => ({
    asset, type, status, createdAt: new Date(now.getTime() - hours * 3600000),
});
const assets = [
    { _id: 'a', name: 'Press', serialNumber: 'P-1', status: 'maintenance' },
    { _id: 'b', name: 'Conveyor', serialNumber: 'C-2', status: 'operational' },
];

test('equipment case counts exclude closed, routine, and out-of-window records', () => {
    const result = summarizeEquipmentCases([
        sample('a', 'incident'), sample('a', 'maintenance'),
        sample('b', 'incident'), sample('b', 'incident'),
        sample('a', 'operation'), sample('a', 'inspection'),
        sample('b', 'incident', 'resolved'), sample('a', 'maintenance', 'open', 200),
    ], assets, 7, now);
    assert.equal(result.totalOpenCases, 4);
    assert.deepEqual(result.items.map(x => [x.assetId, x.openCases, x.incidents, x.maintenance]),
        [['b', 2, 2, 0], ['a', 2, 1, 1]]);
    assert.equal(result.missingAssetCases, 0);
    assert.equal(result.remainingOpenCases, 0);
});

test('missing equipment remains in totals and empty inputs remain zero', () => {
    const result = summarizeEquipmentCases([
        sample('a', 'incident'), sample('removed', 'incident'), sample(null, 'maintenance'),
        { asset: 'a', type: 'incident', status: 'open', createdAt: null },
    ], assets, 7, now);
    assert.equal(result.totalOpenCases, 3);
    assert.equal(result.missingAssetCases, 2);
    assert.equal(result.linkedOpenCases, 1);
    assert.equal(result.displayedOpenCases, 1);
    assert.equal(summarizeEquipmentCases([], assets, 30, now).totalOpenCases, 0);
});

test('top ten are stable and remaining workload is accounted for', () => {
    const listed = Array.from({ length: 12 }, (_, i) => ({
        _id: String(i), name: 'Asset '+i, serialNumber: 'SER-'+String(i).padStart(2, '0'),
        status: 'operational',
    }));
    const result = summarizeEquipmentCases(listed.map(asset => sample(asset._id, 'maintenance')), listed, 30, now);
    assert.equal(result.totalOpenCases, 12);
    assert.equal(result.totalEquipment, 12);
    assert.equal(result.displayedEquipment, 10);
    assert.equal(result.displayedOpenCases, 10);
    assert.equal(result.remainingOpenCases, 2);
    assert.equal(result.items[0].serialNumber, 'SER-00');
    assert.equal(result.items[9].serialNumber, 'SER-09');
    assert.equal(result.displayedOpenCases + result.remainingOpenCases + result.missingAssetCases,
        result.totalOpenCases);
});
