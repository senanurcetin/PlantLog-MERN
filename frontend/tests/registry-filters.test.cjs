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
const compiledExports = {};
const code = new Function('exports', compiled);
code(compiledExports);
const { filterAssets, filterLogs, logsToCsv, assetsToCsv, countOpenMaintenanceCases } = compiledExports;

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

test('CSV export includes selected records with header and correct quoting', () => {
    const csv = logsToCsv(logs);
    assert.match(csv, /^"ID","Created At","Type","Status"/);
    assert.match(csv, /"Hydraulic leak"/);
    assert.match(csv, /"Conveyor serviced"/);
    assert.equal(csv.split('\r\n').length, 4);
});
test('CSV export escapes formula-prefixed and quote-containing content', () => {
    const csv = logsToCsv([{ ...logs[0], title: '=HYPERLINK("bad","click")',
        description: '  +danger', asset: { name: '@risk', serialNumber: 'ABC' } }]);
    assert.ok(csv.includes('"' + "'=HYPERLINK(\"\"bad\"\",\"\"click\"\")" + '"'));
    assert.ok(csv.includes('"' + "'  +danger" + '"'));
    assert.ok(csv.includes('"' + "'@risk" + '"'));
});

test('dashboard attention excludes routine operation and inspection records', () => {
    const sample = [
        { type: 'operation', status: 'open' },
        { type: 'inspection', status: 'in_progress' },
        { type: 'incident', status: 'open' },
        { type: 'incident', status: 'resolved' },
        { type: 'maintenance', status: 'acknowledged' },
        { type: 'maintenance', status: 'resolved' },
    ];
    assert.equal(countOpenMaintenanceCases(sample), 2);
    assert.equal(countOpenMaintenanceCases([]), 0);
    assert.equal(countOpenMaintenanceCases([
        { type: 'operation', status: 'open' },
        { type: 'inspection', status: 'open' },
    ]), 0);
});

test('asset export includes only the currently filtered equipment', () => {
    const selected = filterAssets(assets, 'press', 'maintenance');
    const csv = assetsToCsv(selected);
    assert.match(csv, /^"ID","Name","Serial Number","Category","Status","Location","Created At"/);
    assert.match(csv, /"Hydraulic Press"/);
    assert.doesNotMatch(csv, /"Conveyor"/);
    assert.equal(csv.split('\r\n').length, 3);
});

test('asset export quotes unsafe spreadsheet values and text punctuation', () => {
    const csv = assetsToCsv([{
        ...assets[0], name: '=HYPERLINK("demo","click")',
        serialNumber: ' +7', location: '@risk, calibration', category: 'machinery',
    }]);
    assert.ok(csv.includes('"\'=HYPERLINK(""demo"",""click"")"'));
    assert.ok(csv.includes('"\' +7"'));
    assert.ok(csv.includes('"\'@risk, calibration"'));
    assert.equal(assetsToCsv([]).split('\r\n').length, 2);
});
