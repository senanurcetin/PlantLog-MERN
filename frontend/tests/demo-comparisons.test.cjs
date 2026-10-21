const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),path=require('node:path'),ts=require('typescript');
const fixture=require('../src/demo/fixture.json');
const load=(p,req={})=>{
 const src=readFileSync(path.resolve(__dirname,'../src/demo',p),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};new Function('require','module','exports',js)((id)=>req[id]||require(id),mod,mod.exports);return mod.exports;
};
const original=JSON.stringify(fixture);
const core=load('insights.ts');
const quality=load('quality.ts');
const {compareDemoCases}=load('comparisons.ts',{'./insights':core,'./quality':quality});

test('controlled experiments compare one-record perturbations with identical baselines',()=>{
 const result=compareDemoCases(fixture.assets,fixture.logs,fixture.context.snapshot);
 assert.equal(result.length,5);
 assert.deepEqual(result.map(x=>x.id),[
   'baseline','open-incident','open-maintenance','resolved-incident','missing-link'
 ]);
 const byId=Object.fromEntries(result.map(x=>[x.id,x]));
 assert.equal(byId.baseline.records,12);
 assert.equal(byId.baseline.openCases,4);
 assert.equal(byId.baseline.deltaOpenCases,0);
 assert.equal(byId.baseline.eligibleRecords,12);
 assert.equal(byId.baseline.excludedRecords,0);
 for(const id of ['open-incident','open-maintenance','resolved-incident','missing-link'])
   assert.equal(byId[id].deltaRecords,1);
 for(const id of ['open-incident','open-maintenance','resolved-incident']){
   assert.equal(byId[id].eligibleRecords,13,'valid hypothetical record must have its own unique identity');
   assert.equal(byId[id].excludedRecords,0);
 }
 assert.equal(byId['missing-link'].eligibleRecords,12);
 assert.equal(byId['missing-link'].excludedRecords,1);
 assert.equal(byId['open-incident'].deltaOpenCases,1);
 assert.equal(byId['open-maintenance'].deltaOpenCases,1);
 assert.equal(byId['resolved-incident'].deltaOpenCases,0);
 assert.equal(byId['missing-link'].deltaOpenCases,1);
 assert.equal(byId['missing-link'].deltaUnlinked,1);
 assert.equal(byId['resolved-incident'].deltaUnlinked,0);
 assert.equal(JSON.stringify(fixture),original,'hypothetical cases must never mutate fixture');
});

test('empty scenario universe rejects an experiment rather than inventing equipment',()=>{
 assert.throws(()=>compareDemoCases([],[],'2026-10-18'),/in-service/);
 assert.throws(()=>compareDemoCases([{id:'a',name:'Old',serialNumber:'a',status:'decommissioned'}],[],'2026-10-18'),/in-service/);
});


test('comparison IDs are collision-safe and quality denominators remain honest',()=>{
 const collision=structuredClone(fixture);
 collision.logs[0].id='COMPARE-open-incident';
 const result=compareDemoCases(collision.assets,collision.logs,collision.context.snapshot);
 const added=result.find(x=>x.id==='open-incident');
 assert.equal(added.eligibleRecords,13);
 assert.equal(added.excludedRecords,0);
 assert.equal(result.find(x=>x.id==='missing-link').excludedRecords,1);
 assert.equal(collision.logs.length,12,'hypothetical comparisons may not modify source log count');
});
