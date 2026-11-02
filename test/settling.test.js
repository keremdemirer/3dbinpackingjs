const assert = require('node:assert/strict');
const {test} = require('node:test');
const {pack} = require('3dbinpackingjs');
const {corpus} = require('../bench/corpus.js');
const {validate} = require('../bench/validate.js');
const {analyze} = require('../demo/support.js');

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function compare(input) {
  const before = pack(input);
  const request = freeze({...input, settle:true});
  const after = pack(request);
  validate(request, after);
  assert.deepEqual(after, pack(request), 'deterministic, including diagnostics');
  assert.deepEqual(before, pack({...input, settle:false}), 'omitted and disabled remain identical');
  assert.deepEqual(after.unpacked, before.unpacked);
  assert.equal(after.packedVolume, before.packedVolume);
  assert.equal(after.packedCount, before.packedCount);
  assert.equal(after.utilization, before.utilization);
  assert.equal(after.diagnostics.iterations, before.diagnostics.iterations);
  let movedCount=0, totalDrop=0;
  after.placements.forEach((item,i)=>{
    const old=before.placements[i];
    assert.deepEqual({...item,position:old.position},old, 'identity, order, dimensions and rotations preserved');
    assert.equal(item.position.x,old.position.x); assert.equal(item.position.z,old.position.z);
    assert.ok(item.position.y<=old.position.y, 'only moves downward along original Y');
    if(item.position.y<old.position.y) {movedCount++;totalDrop+=old.position.y-item.position.y;}
    // Independent fixed-point condition: no box can move even one integer unit
    // downward without crossing the floor or colliding with another placement.
    if(item.position.y>0) {
      const shifted={...item,position:{...item.position,y:item.position.y-1}};
      const collision=after.placements.some((other,j)=>j!==i && ['x','y','z'].every((axis,k)=>{
        const dim=['width','height','depth'][k];
        return shifted.position[axis]<other.position[axis]+other.dimensions[dim] && other.position[axis]<shifted.position[axis]+shifted.dimensions[dim];
      }));
      assert.ok(collision, 'settling leaves no downward clearance');
    }
  });
  assert.deepEqual(after.diagnostics.settling,{movedCount,totalDrop});
  assert.equal(analyze(after).noContact,0);
  return {before,after};
}

test('upright screenshot stack drops from Y=1/3/5 to Y=0/2/4',()=>{
  const input=corpus().find(c=>c.id==='reported-overhang').input;
  input.items[1].rotation='upright';
  const {before,after}=compare(input);
  const stack=r=>r.placements.filter(p=>p.itemIndex===2 && p.position.z===5).map(p=>p.position.y);
  assert.deepEqual(stack(before),[5,3,1]); assert.deepEqual(stack(after),[4,2,0]);
  assert.equal(analyze(before).noContact,1);
  assert.equal(after.packedCount,19); assert.equal(after.utilization,0.78125);
  assert.deepEqual(after.diagnostics.settling,{movedCount:3,totalDrop:3});
});
test('settling preserves all benchmark volumes, identities, rotation rules and valid geometry',()=>{
  corpus().forEach(entry=>compare(entry.input));
});
test('seeded mixed rotation cases settle without overlap or remaining downward clearance',()=>{
  let seed=4391;const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let i=0;i<60;i++) compare({container:{width:8,height:10,depth:7},items:Array.from({length:8},(_,id)=>({
    id,width:next(5)+1,height:next(6)+1,depth:next(5)+1,quantity:next(3)+1,rotation:['free','fixed','upright'][next(3)]
  }))});
});
test('settling is not a full-base-contact or stability guarantee',()=>{
  const {after}=compare(corpus().find(c=>c.id==='reported-overhang').input);
  assert.ok(analyze(after).partialContact>0);
});
test('settle accepts only booleans and handles empty/no-fit calls',()=>{
  const input={container:{width:1,height:1,depth:1},items:[]};
  for(const settle of [null,0,1,'true',{},[]]) assert.throws(()=>pack({...input,settle}),/settle must be a boolean/);
  assert.equal(pack(input).diagnostics.settling,undefined);
  for(const items of [[],[{width:2,height:2,depth:2}]]) assert.deepEqual(pack({...input,items,settle:true}).diagnostics.settling,{movedCount:0,totalDrop:0});
});
