const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const fixture=require('../src/demo/fixture.json');
const source=readFileSync(path.resolve(__dirname,'../src/demo/quality.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('module','exports',js)(mod,mod.exports);
const {assessDemoDataQuality}=mod.exports;

test('reference fixture is internally consistent and reports all six gates',()=>{
    const report=assessDemoDataQuality(fixture.assets,fixture.logs,fixture.context.snapshot);
    assert.equal(report.assessedRecords,12);
    assert.equal(report.assessedAssets,8);
    assert.equal(report.eligibleRecords,12);
    assert.equal(report.findings.length,6);
    assert.equal(report.findings.every(x=>x.count===0),true);
});
test('quality findings preserve denominators and distinguish overlapping exclusions',()=>{
    const assets=[{id:'a',name:'Press',status:'operational',serialNumber:'A'},
                  {id:'a',name:'Duplicate',status:'maintenance',serialNumber:'B'}];
    const logs=[
        {id:'1',assetId:'a',status:'open',type:'incident',date:'2026-10-18T09:00:00Z'},
        {id:'1',assetId:'lost',status:'unexpected',type:'maintenance',date:'bad-date'},
        {id:'3',assetId:'a',status:'resolved',type:'incident',date:'2026-10-19T00:00:00Z'},
    ];
    const report=assessDemoDataQuality(assets,logs,'2026-10-18');
    assert.equal(report.eligibleRecords,1);
    assert.equal(report.assessedRecords,3);
    assert.equal(report.unlinkedRecords,1);
    assert.equal(report.invalidDates,1);
    assert.equal(report.unknownStatuses,1);
    assert.equal(report.outsideSnapshot,1);
    assert.equal(report.duplicateAssets,1);
    assert.equal(report.duplicateLogIds,1);
    assert.equal(report.findings.reduce((sum,x)=>sum+x.count,0),5);
    assert.match(report.caveat,/not operational reliability/);
});
test('empty fixture and invalid observation dates do not produce fake counts',()=>{
    const report=assessDemoDataQuality([],[],'2026-10-18');
    assert.equal(report.eligibleRecords,0);
    assert.equal(report.assessedRecords,0);
    assert.throws(()=>assessDemoDataQuality([],[],'2026-02-30'));
});
