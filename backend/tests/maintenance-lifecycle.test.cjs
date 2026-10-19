const test = require('node:test');
const assert = require('node:assert/strict');
const { statusTransition } = require('../dist/utils/logLifecycle.js');
const { summarizeMaintenance } = require('../dist/utils/maintenanceAnalytics.js');

test('lifecycle enforces forward-only transitions', () => {
    assert.equal(statusTransition('open', 'acknowledged'), 'acknowledgedAt');
    assert.equal(statusTransition('acknowledged', 'in_progress'), 'workStartedAt');
    assert.equal(statusTransition('in_progress', 'resolved'), 'resolvedAt');
    assert.equal(statusTransition('open', 'resolved'), 'resolvedAt');
    assert.equal(statusTransition('open', 'open'), null);
    for (const [from, to] of [
        ['resolved', 'open'], ['acknowledged', 'open'],
        ['in_progress', 'acknowledged'], ['resolved', 'in_progress'],
        ['open', 'in_progress'], ['open', 'bogus'],
    ]) {
        assert.throws(() => statusTransition(from, to), /Invalid status transition/);
    }
});
test('report-to-resolution excludes legacy, incomplete, unresolved and out-of-window entries', () => {
    const to = new Date('2026-10-19T12:00:00.000Z');
    const first = new Date('2026-10-18T08:00:00.000Z');
    const second = new Date('2026-10-19T06:00:00.000Z');
    const make = (start, hours) => {
        const resolved = new Date(start.getTime() + hours * 3600000);
        return {
            type: 'incident', status: 'resolved', createdAt: start,
            reportedAt: start, resolvedAt: resolved,
            statusHistory: [
                { from: null, to: 'open', changedAt: start },
                { from: 'open', to: 'resolved', changedAt: resolved },
            ],
        };
    };
    const rows = [
        make(first, 2), make(second, 4),
        { type: 'maintenance', status: 'resolved',
            createdAt: first, reportedAt: first, resolvedAt: new Date(first.getTime() + 1000),
            statusHistory: [] },
        { type: 'incident', status: 'open', reportedAt: first, createdAt: first },
        { type: 'operation', status: 'resolved', createdAt: first },
        make(new Date('2026-09-01T06:00:00.000Z'), 1),
    ];
    const result = summarizeMaintenance(rows, 7, to);
    assert.equal(result.records, 4);
    assert.equal(result.unresolved, 1);
    assert.equal(result.legacyOrIncomplete, 1);
    assert.equal(result.eligibleResolved, 2);
    assert.equal(result.averageHoursToResolve, 3);
    assert.equal(result.medianHoursToResolve, 3);
    assert.match(result.interpretation, /Not machine downtime, MTTR or MTBF/);
});
test('legacy resolved records without full events never produce a spurious estimate', () => {
    const to = new Date('2026-10-19T12:00:00.000Z');
    const result = summarizeMaintenance([
        { type: 'maintenance', status: 'resolved', createdAt: '2026-10-19T00:00:00Z' },
    ], 30, to);
    assert.equal(result.legacyOrIncomplete, 1);
    assert.equal(result.eligibleResolved, 0);
    assert.equal(result.averageHoursToResolve, null);
    assert.equal(result.medianHoursToResolve, null);
});
