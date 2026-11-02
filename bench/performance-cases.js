'use strict';
const {corpus}=require('./corpus.js');
function parityCases() {
  const entries=corpus();
  let seed=7469;
  const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
  for(let i=0;i<60;i++) entries.push({id:`cursor-seed-${i}`,input:{container:{width:9,height:8,depth:7},items:Array.from({length:next(7)+1},(_,id)=>({
    id:id%2,width:next(6)+1,height:next(5)+1,depth:next(6)+1,quantity:next(8)+1,rotation:['free','fixed','upright'][next(3)]
  }))}});
  for(const count of [1000,3000]) entries.push({id:`quantity-${count}`,input:{container:{width:count,height:1,depth:1},items:[{width:1,height:1,depth:1,quantity:count}]}});
  const upright=structuredClone(entries.find(e=>e.id==='reported-overhang'));
  upright.id='reported-upright-gap';upright.input.items[1].rotation='upright';entries.push(upright);
  return entries.flatMap(entry=>[entry,{id:entry.id+'-settled',input:{...entry.input,settle:true}}]);
}
module.exports={parityCases};
