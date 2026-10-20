const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const fixture = require('../src/demo/fixture.json');

const source = fs.readFileSync(path.join(__dirname, '../src/demo/insights.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleObj = { exports: {} };
new Function('module', 'exports', compiled)(moduleObj, moduleObj.exports);
const { buildDemoInsights } = moduleObj.exports;

test('published synthetic snapshot reconciles 12 records and four open incident/maintenance cases', () => {
    const s = buildDemoInsights(fixture.assets, fixture.logs, fixture.context.snapshot);
    assert.equal(s.totalRecords, 12);
    assert.deepEqual(s.byType, {incident: 2, maintenance: 4, inspection: 3, operation: 3});
    assert.equal(s.openMaintenanceCases, 4);
    assert.equal(s.otherOpenEntries, 1);
    assert.equal(s.affectedEquipment, 3);
    assert.equal(s.unlinkedOpenCases, 0);
    assert.equal(s.equipment.reduce((total, row) => total + row.openCases, 0),
        s.openMaintenanceCases - s.unlinkedOpenCases);
    assert.equal(s.equipment[0].name, 'Conveyor Line C-12');
    assert.equal(s.equipment[0].openCases, 2);
    assert.equal(s.equipment[0].incidents, 1);
    assert.equal(s.equipment[0].maintenance, 1);
    assert.equal(s.dailyIntake.length, 8);
    assert.equal(s.outsideWindow, 0);
    assert.equal(s.dailyIntake.reduce((total, bucket) => total + bucket.total, 0),
        s.totalRecords);
});

test('date buckets use stable UTC calendar dates and correctly distinguish other open work', () => {
    const s = buildDemoInsights(
        [{id:'a',name:'Press',status:'operational',serialNumber:'S1'}],
        [
            {assetId:'a', type:'incident',status:'open', date:'2026-10-18T23:59:00Z'},
            {assetId:'a', type:'maintenance',status:'resolved', date:'2026-10-17T23:59:00Z'},
            {assetId:'a', type:'inspection',status:'acknowledged',date:'2026-10-16T00:00:00Z'},
            {assetId:'a', type:'operation',status:'open', date:'2026-10-15T11:00:00Z'},
            {assetId:'a', type:'incident',status:'open', date:'2026-10-01T00:00:00Z'},
            {assetId:'missing',type:'maintenance',status:'open',date:'2026-10-18T10:00:00Z'},
        ], '2026-10-18', 3,
    );
    assert.deepEqual(s.dailyIntake.map(x=>x.day),['2026-10-16','2026-10-17','2026-10-18']);
    assert.equal(s.dailyIntake[2].total, 2);
    assert.equal(s.dailyIntake[0].inspection, 1);
    assert.equal(s.openMaintenanceCases, 3);
    assert.equal(s.otherOpenEntries, 2);
    assert.equal(s.unlinkedOpenCases, 1);
    assert.equal(s.affectedEquipment, 1);
    assert.equal(s.equipment[0].openCases,2);
    assert.equal(s.outsideWindow,2);
    assert.equal(s.dailyIntake.reduce((sum,row)=>sum+row.total,0)+s.outsideWindow,6);
});

test('zero and resolved-only fixture produces no false attention', () => {
    const a=[{id:'a',name:'Asset',serialNumber:'ABC',status:'operational'}];
    const empty=buildDemoInsights(a,[], '2026-10-18');
    assert.equal(empty.openMaintenanceCases,0);
    assert.equal(empty.affectedEquipment,0);
    assert.equal(empty.dailyIntake.every(day=>day.total===0),true);
    const resolved=buildDemoInsights(a,[
        {assetId:'a',type:'incident',status:'resolved',date:'2026-10-18T12:00:00Z'}
    ], '2026-10-18');
    assert.equal(resolved.openMaintenanceCases,0);
    assert.equal(resolved.byType.incident,1);
    assert.throws(()=>buildDemoInsights(a,[], '2026-02-30'));
});
