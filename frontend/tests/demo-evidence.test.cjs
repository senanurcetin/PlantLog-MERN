const {test} = require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const path=require('node:path');
const fixture=require('../src/demo/fixture.json');
const source=fs.readFileSync(path.join(__dirname,'../src/demo/evidence.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const moduleObj={exports:{}};
const {buildDemoInsights}=require('./helpers/insights-test-helper.cjs');
new Function('require','module','exports',compiled)((x)=>{
 if(x==='./insights')return {buildDemoInsights};
 throw new Error('Unexpected test module '+x);
},moduleObj,moduleObj.exports);
const {auditEvidence,runEvidenceCase,evidenceCases,hasVerifiableHistory}=moduleObj.exports;
const unchanged=JSON.stringify(fixture);

test('published fixture has a reproducible and honest audit denominator',()=>{
 const baseline=auditEvidence(fixture);
 assert.deepEqual({
  records:baseline.records,broken:baseline.unlinkedRecords,
  duplicates:baseline.duplicatedRecordIds,incomplete:baseline.incompleteCaseHistories,
  eligible:baseline.evidenceQualifiedResolved,open:baseline.openMaintenanceCases,
 },{records:12,broken:0,duplicates:0,incomplete:4,eligible:1,open:4});
 assert.deepEqual(baseline.eligibleResolutionMinutes,[215]);
 assert.equal(baseline.invalidDates,0);
 assert.equal(baseline.futureDatedRecords,0);
 assert.equal(baseline.outsideWindow,0);
});

test('five controlled experiments yield exactly the expected isolated differences',()=>{
 const baseline=runEvidenceCase(fixture,'baseline');
 const testCases=[
  ['unlinked','unlinkedRecords',1],['missing-history','incompleteCaseHistories',5],
  ['duplicate-id','duplicatedRecordIds',1],['future-date','futureDatedRecords',1],
 ];
 for(const [id,key,value] of testCases){
  const result=runEvidenceCase(fixture,id);
  assert.equal(result[key],value,id);
  assert.equal(result.records,12,'no artificial additions');
  assert.equal(result.openMaintenanceCases,baseline.openMaintenanceCases,'same statuses');
  assert.equal(JSON.stringify(fixture),unchanged,'original fixture not modified');
 }
 const unlinked=runEvidenceCase(fixture,'unlinked');
 assert.equal(unlinked.unlinkedOpenCases,1);
 const missing=runEvidenceCase(fixture,'missing-history');
 assert.equal(missing.evidenceQualifiedResolved,0);
 assert.deepEqual(missing.eligibleResolutionMinutes,[]);
 const future=runEvidenceCase(fixture,'future-date');
 assert.equal(future.outsideWindow,1);
 assert.equal(evidenceCases.length,5);
});

test('malformed, contradictory or future-dated audit events are not quietly repaired',()=>{
 const ref=fixture.logs.find(x=>x.id==='L007');
 const snapshotEnd=Date.parse(fixture.context.snapshot+'T23:59:59.999Z');
 assert.equal(hasVerifiableHistory(ref,snapshotEnd),true);
 assert.equal(hasVerifiableHistory({...ref,statusHistory:ref.statusHistory.slice(1)},snapshotEnd),false);
 assert.equal(hasVerifiableHistory({...ref,status:'open'},snapshotEnd),false);
 assert.equal(hasVerifiableHistory({...ref,statusHistory:ref.statusHistory.map((v,i)=>
  i===2?{...v,changedAt:'2026-10-14T01:00:00Z'}:v)},snapshotEnd),false);
 assert.equal(hasVerifiableHistory({...ref,statusHistory:ref.statusHistory.map((v,i)=>
  i===3?{...v,changedBy:''}:v)},snapshotEnd),false);
 assert.equal(hasVerifiableHistory({...ref,date:'2026-10-19T12:00:00Z'},snapshotEnd),false);
 assert.equal(JSON.stringify(fixture),unchanged);
});

test('strict UTC instant validation rejects impossible calendar dates and local timestamps',()=>{
 const sample=fixture.logs.find(x=>x.id==='L007');
 const end=Date.parse(fixture.context.snapshot+'T23:59:59.999Z');
 assert.equal(hasVerifiableHistory({...sample,date:'2026-02-30T11:30:00Z'},end),false);
 assert.equal(hasVerifiableHistory({...sample,date:'2026-10-15T11:30:00'},end),false);
 assert.equal(hasVerifiableHistory({...sample,date:'2026-10-15T11:30:00+00:00'},end),false);
 assert.equal(hasVerifiableHistory({...sample,date:'invalid'},end),false);
 const withBad={...fixture,logs:[{...fixture.logs[0],date:'2026-02-30T06:40:00Z'}]};
 const audited=auditEvidence(withBad);
 assert.equal(audited.invalidDates,1);
 assert.equal(audited.records,fixture.logs.length);
 assert.equal(JSON.stringify(fixture),unchanged);
});
