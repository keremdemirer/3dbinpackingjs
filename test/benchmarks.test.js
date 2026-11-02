const assert=require('node:assert/strict');
const {test}=require('node:test');
const {pack}=require('3dbinpackingjs');
const {validate}=require('../bench/validate.js');
const {exactGrid}=require('../bench/exact.js');
const {corpus}=require('../bench/corpus.js');
const {runCase,compareQuality,qualityBaseline}=require('../bench/run.js');
const request={container:{width:2,height:1,depth:1},items:[{id:'cube',width:1,height:1,depth:1,quantity:2}]};
const clone=value=>JSON.parse(JSON.stringify(value));

test('benchmark validator rejects overlap, bounds, identity, rotation, and total errors',()=>{
  const original=pack(request);validate(request,original);
  const mutations=[
    r=>{r.placements[1].position={...r.placements[0].position};},
    r=>{r.placements[0].position.x=99;},
    r=>{r.placements[1].instanceIndex=0;},
    r=>{r.packedVolume=0;},r=>{r.utilization=0;},
    r=>{r.placements[0].itemIndex=7;},r=>{r.placements[0].position.x=NaN;},
    r=>{r.placements[0].id='wrong';},r=>{r.unpacked.push(r.placements.pop());}
  ];
  for(const mutate of mutations){const result=clone(original);mutate(result);assert.throws(()=>validate(request,result));}
  const fixed={container:{width:2,height:3,depth:4},items:[{width:2,height:3,depth:4,rotation:'fixed'}]};
  const result=pack(fixed);result.placements[0].dimensions={width:3,height:2,depth:4};
  assert.throws(()=>validate(fixed,result),/orientation/);
});

test('oracle proves a volume bound can be unattainable and respects orientation',()=>{
  assert.equal(exactGrid({container:{width:3,height:3,depth:2},items:[{width:2,height:2,depth:2,quantity:2}]}).volume,8);
  const input={container:{width:4,height:2,depth:3},items:[{width:2,height:3,depth:4,rotation:'fixed'}]};
  assert.equal(exactGrid(input).volume,0);
  input.items[0].rotation='free';assert.equal(exactGrid(input).volume,24);
  input.items[0].rotation='upright';assert.equal(exactGrid(input).volume,0);
});

test('oracle includes the leave-unpacked branch and does not claim an optimum after a budget exit',()=>{
  const input={container:{width:3,height:3,depth:2},items:[{width:2,height:2,depth:2,quantity:2},{width:1,height:1,depth:2,quantity:5}]};
  assert.equal(exactGrid(input).volume,18);
  const partial=exactGrid(input,{maxStates:1});assert.equal(partial.complete,false);assert.equal(partial.volume,null);
  assert.throws(()=>exactGrid({container:{width:4,height:4,depth:4},items:[]}),RangeError);
  assert.throws(()=>exactGrid({container:{width:1,height:1,depth:1},items:[{width:1,height:1,depth:1,quantity:1e9}]}),RangeError);
});

test('corpus is deterministic and constructive witnesses really fill their containers',()=>{
  assert.deepEqual(corpus(),corpus());assert.equal(new Set(corpus().map(c=>c.id)).size,corpus().length);
  for(const entry of corpus().filter(c=>c.reference?.kind==='constructive-fill')){
    const volume=Object.values(entry.input.container).reduce((a,b)=>a*b,1);
    const placements=entry.reference.witness;
    validate(entry.input,{container:entry.input.container,placements,unpacked:[],totalCount:placements.length,packedCount:placements.length,
      containerVolume:volume,totalItemVolume:volume,packedVolume:volume,utilization:1});
  }
});

test('quality comparison rejects regressions and changed inputs, independently of timings',()=>{
  const report={schemaVersion:1,corpusHash:'corpus',solverHash:'solver',cases:[{ok:true,id:'a',inputHash:'input',packedVolume:12,timing:{medianMs:100}}]};
  const baseline=qualityBaseline(report);
  assert.deepEqual(compareQuality(report,baseline),[]);
  report.cases[0].packedVolume=11;assert.match(compareQuality(report,baseline)[0],/12 → 11/);
  report.cases[0].packedVolume=13;assert.deepEqual(compareQuality(report,baseline),[]);
  report.cases[0].inputHash='changed';assert.match(compareQuality(report,baseline)[0],/changed/);
  report.corpusHash='changed';assert.match(compareQuality(report,baseline)[0],/Corpus/);
  assert.throws(()=>qualityBaseline({...report,cases:[{ok:false}]}));
});

test('worker returns validated samples and a hard deadline terminates pathological runs',async()=>{
  const entry=corpus().find(c=>c.id==='empty');
  const result=await runCase(entry,{samples:2,warmup:1,timeoutMs:5000});
  assert.equal(result.ok,true);assert.equal(result.timing.samples.length,2);assert.equal(result.packedVolume,0);
  assert.ok(result.timing.medianMs<=result.timing.p95Ms);
  const timeout=await runCase(entry,{samples:1e9,warmup:0,timeoutMs:1});assert.equal(timeout.ok,false);assert.match(timeout.error,/exceeded/);
});


test('order sensitivity experiments preserve the original request and validate each trial',()=>{
  const {orderSensitivity}=require('../bench/order-sensitivity.js');
  const entry=corpus().find(c=>c.id==='cut-fill-12');const before=JSON.stringify(entry);
  const report=orderSensitivity(entry,2);
  assert.equal(report.trials.length,5);assert.equal(report.trials[0].order,'original');
  assert.ok(report.bestVolume>=report.trials[0].packedVolume);assert.equal(JSON.stringify(entry),before);
});

test('CLI checks a report baseline, renders timing comparisons, and rejects invalid samples',()=>{
  const {spawnSync}=require('node:child_process'),path=require('node:path');
  const root=path.join(__dirname,'..');
  const run=spawnSync(process.execPath,['bench/run.js','--case','empty','--samples','1','--warmup','0',
    '--baseline','bench/results/baseline-node24.json','--check-quality'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/Observational timing comparison/);
  const bad=spawnSync(process.execPath,['bench/run.js','--samples','0'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(bad.status,1);assert.match(bad.stderr,/samples must/);
});
