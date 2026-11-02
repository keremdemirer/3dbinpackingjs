const assert=require('node:assert/strict');
const {test}=require('node:test');
const {analyze,unionArea}=require('../demo/support.js');
const {pack}=require('3dbinpackingjs');
const {corpus}=require('../bench/corpus.js');
const item=(x,y,z,w,h,d)=>({position:{x,y,z},dimensions:{width:w,height:h,depth:d}});

test('base contact distinguishes floor, full contact, partial overhang, and floating boxes',()=>{
  const result=analyze({placements:[item(0,0,0,2,1,2),item(0,1,0,2,1,2),item(1,2,0,2,1,2),item(10,4,0,1,1,1)]});
  assert.deepEqual(result.records.map(r=>r.kind),['floor','full','partial','none']);
  assert.equal(result.records[2].fraction,0.5);assert.equal(result.noContact,1);assert.equal(result.partialContact,1);
});
test('contact union combines several boxes without double counting and ignores edge-only contact',()=>{
  assert.equal(unionArea([[0,0,2,2],[1,0,3,2]]),6);
  const result=analyze({placements:[item(0,0,0,1,1,2),item(1,0,0,1,1,2),item(0,1,0,2,1,2),item(2,1,0,1,1,1)]});
  assert.equal(result.records[2].fraction,1);assert.equal(result.records[3].fraction,0);
});
test('reported 78.1% arrangement is geometrically valid but two green cartons overhang',()=>{
  const entry=corpus().find(c=>c.id==='reported-overhang');
  const result=pack(entry.input);require('../bench/validate.js').validate(entry.input,result);
  assert.equal(result.packedCount,19);assert.equal(result.utilization,0.78125);
  const contact=analyze(result);
  assert.equal(contact.noContact,0);assert.equal(contact.partialContact,2);
  assert.deepEqual(contact.records.slice(0,4).map(r=>r.fraction),[1,1,0.25,0.1]);
});
test('contact diagnostics do not mutate packing results or claim grounded stability',()=>{
  const result={placements:[item(0,2,0,1,1,1),item(0,3,0,1,1,1)]};const before=JSON.stringify(result);
  const contact=analyze(result);assert.equal(contact.records[1].fraction,1);assert.equal(contact.noContact,1);
  assert.equal(JSON.stringify(result),before);assert.deepEqual(analyze({placements:[]}).records,[]);
});
