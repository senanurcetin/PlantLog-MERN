const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');

// Compile the pure TS selectors in isolation without a browser or API.
const filename = path.join(__dirname, '../src/utils/registryFilters.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
const code = new Function('exports', compiled);
code(exports);
const { filterAssets, filterLogs } = exports;

const assets = [
    { _id: 'a', name: 'Hydraulic Press', serialNumber: 'HP-001', category: 'machinery',
        status: 'maintenance', location: 'Assembly Bay' },
    { _id: 'b', name: 'Conveyor', serialNumber: 'CN-002', category: 'equipment',
        status: 'operational', location: 'Packing Line' },
];
const logs = [
    { _id: 'l1', title: 'Hydraulic leak', description: 'Inspection needed',
        type: 'incident', status: 'open', asset: { name: 'Hydraulic Press', serialNumber: 'HP-001' },
        author: { name: 'Demo Operator' } },
    { _id: 'l2', title: 'Conveyor serviced', description: 'Alignment completed',
        type: 'maintenance', status: 'resolved', asset: { name: 'Conveyor', serialNumber: 'CN-002' },
        author: { name: 'Demo Technician' } },
];

test('asset search covers name, serial, location and category case-insensitively', () => {
    for (const query of ['HYDRAULIC', 'hp-001', 'ASSEMBLY', 'MACHINERY']) {
        assert.deepEqual(filterAssets(assets, query, 'all').map(x => x._id), ['a']);
    }
});
test('asset status filter intersects the query and returns empty when none match', () => {
    assert.deepEqual(filterAssets(assets, '', 'operational').map(x => x._id), ['b']);
    assert.deepEqual(filterAssets(assets, 'press', 'operational'), []);
});
test('log selectors compose search, type and status filters', () => {
    assert.deepEqual(filterLogs(logs, 'hydraulic', 'incident', 'open').map(x => x._id), ['l1']);
    assert.deepEqual(filterLogs(logs, 'Demo technician', 'maintenance', 'resolved').map(x => x._id), ['l2']);
    assert.deepEqual(filterLogs(logs, 'Conveyor', 'incident', 'all'), []);
});
