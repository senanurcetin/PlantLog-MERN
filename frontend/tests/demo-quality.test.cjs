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

test('reference fixture is internally consistent and reports all eight gates',()=>{
    const report=assessDemoDataQuality(fixture.assets,fixture.logs,fixture.context.snapshot);
    assert.equal(report.assessedRecords,12);
    assert.equal(report.assessedAssets,8);
    assert.equal(report.eligibleRecords,12);
    assert.deepEqual(report.eligibleRecordIndices,Array.from({length:12},(_,i)=>i));
    assert.equal(report.findings.length,8);
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
    assert.equal(report.eligibleRecords,0);
    assert.equal(report.assessedRecords,3);
    assert.equal(report.unlinkedRecords,1);
    assert.equal(report.invalidDates,1);
    assert.equal(report.unknownStatuses,1);
    assert.equal(report.outsideSnapshot,1);
    assert.equal(report.duplicateAssets,1);
    assert.equal(report.duplicateLogIds,1);
    assert.equal(report.findings.reduce((sum,x)=>sum+x.count,0),6);
    assert.match(report.caveat,/not operational reliability/);
    assert.match(report.caveat,/missing\/repeated log identifiers/);
});
test('empty fixture and invalid observation dates do not produce fake counts',()=>{
    const report=assessDemoDataQuality([],[],'2026-10-18');
    assert.equal(report.eligibleRecords,0);
    assert.equal(report.assessedRecords,0);
    assert.throws(()=>assessDemoDataQuality([],[],'2026-02-30'));
});

test('identical references to duplicated assets and duplicated logs are not called eligible',()=>{
    const assets=[
        {id:'a',name:'A',serialNumber:'1',status:'operational'},
        {id:'a',name:'A clone',serialNumber:'2',status:'operational'},
        {id:'b',name:'B',serialNumber:'3',status:'maintenance'},
    ];
    const logs=[
        {id:'dup',assetId:'b',type:'incident',status:'open',date:'2026-10-18T08:00:00Z'},
        {id:'dup',assetId:'b',type:'maintenance',status:'open',date:'2026-10-18T09:00:00Z'},
        {id:'unique',assetId:'a',type:'operation',status:'open',date:'2026-10-18T10:00:00Z'},
        {id:'valid',assetId:'b',type:'inspection',status:'resolved',date:'2026-10-18T11:00:00Z'},
    ];
    const summary=assessDemoDataQuality(assets,logs,'2026-10-18');
    assert.equal(summary.eligibleRecords,1);
    assert.equal(summary.duplicateAssets,1);
    assert.equal(summary.duplicateLogIds,1);
    assert.equal(summary.assessedRecords,4);
});

test('non ISO date strings cannot pass the eligible gate merely because JS parses them',()=>{
    const assets=[{id:'a',name:'A',serialNumber:'A',status:'operational'}];
    const logs=[{id:'x',assetId:'a',type:'incident',status:'open',date:'October 18, 2026'}];
    const r=assessDemoDataQuality(assets,logs,'2026-10-18');
    assert.equal(r.invalidDates,1);
    assert.equal(r.eligibleRecords,0);
});

test('missing identities, unknown categories and ambiguous UTC strings are excluded',()=>{
    const assets=[{id:'a',name:'Press',status:'operational',serialNumber:'A'}];
    const logs=[
        {assetId:'a',type:'incident',status:'open',date:'2026-10-18T09:00:00Z'},
        {id:'valid-but-type-unknown',assetId:'a',type:'fantasy',status:'open',date:'2026-10-18T10:00:00Z'},
        {id:'local-time',assetId:'a',type:'incident',status:'open',date:'2026-10-18T09:00:00'},
        {id:'bad-calendar',assetId:'a',type:'incident',status:'open',date:'2026-02-30T12:00:00Z'},
        {id:'offset',assetId:'a',type:'incident',status:'open',date:'2026-10-18T09:00:00+03:00'},
        {id:'valid',assetId:'a',type:'incident',status:'open',date:'2026-10-18T09:00:00.123Z'},
    ];
    const result=assessDemoDataQuality(assets,logs,'2026-10-18');
    assert.equal(result.assessedRecords,6);
    assert.equal(result.missingLogIds,1);
    assert.equal(result.unknownTypes,1);
    assert.equal(result.invalidDates,3);
    assert.equal(result.eligibleRecords,1);
    assert.equal(result.findings.length,8);
    assert.equal(result.findings.find(x=>x.code==='MISSING_LOG_ID').count,1);
    assert.equal(result.findings.find(x=>x.code==='UNKNOWN_TYPE').count,1);
});

test('timestamp boundary and overlapping findings do not double count exclusions',()=>{
    const a=[{id:'a',name:'Press',status:'operational',serialNumber:'A'}];
    const logs=[
        {id:'x',assetId:'lost',type:'unexpected',status:'invalid',date:'no-date'},
        {id:'x',assetId:'a',type:'incident',status:'open',date:'2026-10-18T23:59:59.999Z'},
        {id:'okay',assetId:'a',type:'incident',status:'open',date:'2026-10-18T23:59:59.999Z'},
        {id:'tomorrow',assetId:'a',type:'incident',status:'open',date:'2026-10-19T00:00:00Z'},
    ];
    const r=assessDemoDataQuality(a,logs,'2026-10-18');
    assert.equal(r.eligibleRecords,1);
    assert.equal(r.duplicateLogIds,1);
    assert.equal(r.outsideSnapshot,1);
    assert.equal(r.assessedRecords,4);
});
