'use strict';
const {pack}=require('../pack.js');
const {corpus}=require('./corpus.js');
const {validate}=require('./validate.js');
function orderSensitivity(entry,shuffles=8) {
  const volume=item=>item.width*item.height*item.depth;
  const orders=[['original',entry.input.items],['volume-desc',[...entry.input.items].sort((a,b)=>volume(b)-volume(a))],
    ['volume-asc',[...entry.input.items].sort((a,b)=>volume(a)-volume(b))]];
  for(let seed=1;seed<=shuffles;seed++) {
    const items=[...entry.input.items];let state=seed;
    for(let i=items.length-1;i>0;i--) {state=(Math.imul(state,1664525)+1013904223)>>>0;const j=state%(i+1);[items[i],items[j]]=[items[j],items[i]];}
    orders.push([`shuffle-${seed}`,items]);
  }
  const trials=orders.map(([order,items])=>{
    const input={...entry.input,items};const result=pack(input);validate(input,result);
    return {order,packedVolume:result.packedVolume,utilization:result.utilization};
  });
  return {id:entry.id,bestVolume:Math.max(...trials.map(t=>t.packedVolume)),trials};
}
if(require.main===module) {
  const fs=require('node:fs'),{createHash}=require('node:crypto');
  console.log(JSON.stringify({solverHash:createHash('sha256').update(fs.readFileSync(require.resolve('../pack.js'))).digest('hex'),
    cases:corpus().filter(c=>c.id.startsWith('cut-fill')).map(c=>orderSensitivity(c))},null,2));
}
module.exports={orderSensitivity};
