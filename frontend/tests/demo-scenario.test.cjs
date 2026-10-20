const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const fixture=require('../src/demo/fixture.json');
const original=JSON.stringify(fixture);
const transpile=(file)=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../src/demo/',file),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
  }}).outputText;
  const m={exports:{}};new Function('module','exports',output)(m,m.exports);return m.exports;
};
const {emptyScenario,advanceScenario,scenarioToLog}=transpile('scenario.ts');
const {buildDemoInsights}=transpile('insights.ts');

test('fictional case follows open -> acknowledged -> in progress -> resolved without persistence',()=>{
  let state={...emptyScenario};
  const recorded=[0,1,2,3];
  const actions=['report','acknowledge','start','resolve'];
  const expected=['open','acknowledged','in_progress','resolved'];
  for(const [idx,action] of actions.entries()){
    state=advanceScenario(state,action,'A03',fixture.assets);
    assert.equal(state.phase,expected[idx]);
    const simulated=scenarioToLog(state,fixture.context.snapshot);
    assert.equal(simulated.id,'SIM-001');
    assert.equal(simulated.status,expected[idx]);
    assert.equal(simulated.assetId,'A03');
    assert.equal(simulated.statusHistory.length,recorded[idx]+1);
    assert.equal(simulated.statusHistory.at(-1).to,expected[idx]);
    const all=[simulated,...fixture.logs];
    const summary=buildDemoInsights(fixture.assets,all,fixture.context.snapshot);
    assert.equal(summary.totalRecords,13);
    assert.equal(summary.byType.incident,3);
    assert.equal(summary.openMaintenanceCases,idx===3?4:5);
    assert.equal(summary.equipment.find(row=>row.id==='A03').openCases,idx===3?2:3);
    assert.equal(summary.dailyIntake.reduce((sum,b)=>sum+b.total,0),13);
  }
  state=advanceScenario(state,'reset','',fixture.assets);
  assert.deepEqual(state,emptyScenario);
  assert.equal(scenarioToLog(state,fixture.context.snapshot),null);
  assert.equal(JSON.stringify(fixture),original,'the committed synthetic fixture must stay unchanged');
});

test('cannot skip lifecycle steps or report a decommissioned or absent asset',()=>{
  assert.throws(()=>advanceScenario(emptyScenario,'report','A05',fixture.assets),/in-service/);
  assert.throws(()=>advanceScenario(emptyScenario,'report','does-not-exist',fixture.assets),/in-service/);
  const opened=advanceScenario(emptyScenario,'report','A03',fixture.assets);
  for(const illegal of ['report','start','resolve']){
    assert.throws(()=>advanceScenario(opened,illegal,'A03',fixture.assets));
  }
  const acknowledged=advanceScenario(opened,'acknowledge','A01',fixture.assets);
  assert.equal(acknowledged.assetId,'A03','changing selection must not change the active case');
  const started=advanceScenario(acknowledged,'start','A01',fixture.assets);
  const resolved=advanceScenario(started,'resolve','A01',fixture.assets);
  assert.throws(()=>advanceScenario(resolved,'report','A02',fixture.assets));
  assert.throws(()=>advanceScenario(resolved,'resolve','A02',fixture.assets));
  assert.deepEqual(advanceScenario(resolved,'reset','A01',fixture.assets),emptyScenario);
  assert.equal(JSON.stringify(fixture),original);
});

test('scenario dates and audit transitions are deterministic, chronological and synthetic',()=>{
  let s=emptyScenario;
  for(const action of ['report','acknowledge','start','resolve'])s=advanceScenario(s,action,'A08',fixture.assets);
  const log=scenarioToLog(s,fixture.context.snapshot);
  assert.equal(log.date,'2026-10-18T17:00:00.000Z');
  assert.equal(log.statusHistory[0].from,null);
  assert.equal(log.statusHistory[1].from,'open');
  assert.equal(log.statusHistory.at(-1).from,'in_progress');
  for(let i=1;i<log.statusHistory.length;i++){
    assert.ok(log.statusHistory[i].changedAt>log.statusHistory[i-1].changedAt);
  }
  assert.match(log.description,/fictional incident/);
});
