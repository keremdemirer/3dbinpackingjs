const assert=require('node:assert/strict');
const {test}=require('node:test');
const {pack}=require('3dbinpackingjs');
const {qualityCases}=require('../bench/quality-cases.js');
const {validate}=require('../bench/validate.js');
const {parityCases}=require('../bench/performance-cases.js');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
test('extended search fills the 12-piece case and retains the better standard 24-piece result',()=>{
  for(const [id,volume] of [['cut-fill-12',960],['cut-fill-24',882]]) {
    const input=qualityCases().find(e=>e.id===id).input;
    const result=pack({...input,search:'extended'});validate(input,result);
    assert.equal(result.packedVolume,volume);assert.equal(result.diagnostics.search.passes,2);
    if(id==='cut-fill-12')assert.equal(result.packedCount,12);
  }
});
test('extended search validates across the corpus and held-out known fills without packed-volume regressions',()=>{
  let holdoutGains=0;
  for(const entry of qualityCases()) {
    const before=pack(entry.input);const request=freeze({...entry.input,search:'extended'});
    const result=pack(request);validate(request,result);
    assert.ok(result.packedVolume>=before.packedVolume,entry.id);
    assert.ok(result.diagnostics.iterations<=before.diagnostics.iterations*2,entry.id+' bounded trials');
    assert.deepEqual(result,pack(request),entry.id+' deterministic/frozen input');
    if(result.packedVolume===before.packedVolume) {
      const diagnostics={...result.diagnostics};delete diagnostics.search;diagnostics.iterations=before.diagnostics.iterations;
      assert.deepEqual({...result,diagnostics},before,entry.id+' equal volume retains original placements');
    }
    if(entry.family==='holdout-known-fill'&&result.packedVolume>before.packedVolume)holdoutGains++;
  }
  assert.equal(holdoutGains,4);
});
test('standard remains the exact default and extended respects seeded rotations, quantities and settling',()=>{
  for(const entry of parityCases()) {
    const before=pack(entry.input);assert.deepEqual(pack({...entry.input,search:'standard'}),before);
    const request={...entry.input,search:'extended'};const result=pack(request);validate(request,result);
    assert.ok(result.packedVolume>=before.packedVolume,entry.id);
    if(request.settle)assert.equal(require('../demo/support.js').analyze(result).noContact,0);
  }
});
test('extended search skips its extra pass at the volume bound and rejects unknown modes',()=>{
  const input={container:{width:2,height:2,depth:2},items:[{width:1,height:1,depth:1}]};
  for(const items of [input.items,[]]) assert.equal(pack({...input,items,search:'extended'}).diagnostics.search.passes,1);
  for(const search of [null,false,1,'best',{},[]])assert.throws(()=>pack({...input,search}),/search must be standard or extended/);
  assert.equal(pack(input).diagnostics.search,undefined);
});
