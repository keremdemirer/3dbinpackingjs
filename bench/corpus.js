'use strict';
const dims = (width, height, depth) => ({ width, height, depth });
function random(seed) {
  return max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
}
function tiling(id, count, seed) {
  const next = random(seed), container = dims(12,10,8);
  const cells = [{ ...container, x:0, y:0, z:0 }];
  while (cells.length < count) {
    cells.sort((a,b) => b.width*b.height*b.depth - a.width*a.height*a.depth);
    const cell = cells.shift();
    const axes = ['width','height','depth'].filter(axis => cell[axis] > 1);
    const axis = axes[next(axes.length)], position = { width:'x', height:'y', depth:'z' }[axis];
    const cut = next(cell[axis]-1)+1;
    cells.push({ ...cell, [axis]:cut }, { ...cell, [axis]:cell[axis]-cut, [position]:cell[position]+cut });
  }
  const items = cells.map((c,i) => ({ id:`cut-${i}`, ...dims(c.width,c.height,c.depth) }));
  const witness = cells.map((c,i) => ({ id:items[i].id, itemIndex:i, instanceIndex:0,
    position:{x:c.x,y:c.y,z:c.z}, dimensions:dims(c.width,c.height,c.depth) }));
  return { id, family:'known-fill', input:{container,items}, reference:{kind:'constructive-fill', witness}, quick:true };
}
function mixed(id, types, seed, constrained=false) {
  const next=random(seed);
  return { id, family:constrained?'mixed-rules':'mixed', input:{container:dims(24,20,16),items:Array.from({length:types},(_,i) => ({
    id:`type-${i}`, ...dims(next(11)+1,next(9)+1,next(10)+1), quantity:next(3)+1,
    ...(constrained?{rotation:['free','upright','fixed'][next(3)]}:{})
  }))} };
}
function tiny(id, seed) {
  const next=max=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)%max;};
  return {id,family:'tiny-exact',input:{container:dims(3,3,2),items:Array.from({length:5},(_,i)=>({
    id:i,...dims(next(3)+1,next(3)+1,next(2)+1),rotation:['free','upright','fixed'][next(3)]
  }))},reference:{kind:'integer-grid'},quick:true};
}
function corpus() {
  const cases = [
    {id:'empty',family:'control',input:{container:dims(10,10,10),items:[]},quick:true},
    {id:'no-fit',family:'control',input:{container:dims(2,2,2),items:[dims(3,3,3)]},quick:true},
    {id:'exact-cubes',family:'known-fill',input:{container:dims(8,8,8),items:[{...dims(2,2,2),quantity:64}]},
      reference:{kind:'integer-grid'},quick:true},
    tiling('cut-fill-12',12,42), tiling('cut-fill-24',24,1337),
    {id:'reported-overhang',family:'base-contact',input:{container:dims(12,10,8),items:[{id:'Carton A',...dims(5,4,4),quantity:4},{id:'Carton B',...dims(2,7,5),quantity:5},{id:'Small box',...dims(2,2,2),quantity:10}]},quick:true},
    {id:'issue-6',family:'historical',input:{container:dims(306,102,112),items:[{...dims(225,5,20),quantity:130}]}},
    {id:'paper-example',family:'historical',input:{container:dims(84,104,96),items:[{...dims(40,52,36),quantity:3},{...dims(70,104,24),quantity:4},{...dims(14,104,48),quantity:2}]}},
    {id:'upright-swap',family:'rotation',input:{container:dims(4,3,2),items:[{...dims(2,3,4),rotation:'upright'}]},quick:true},
    {id:'fixed-no-fit',family:'rotation',input:{container:dims(4,3,2),items:[{...dims(2,3,4),rotation:'fixed'}]},quick:true}
  ];
  // Same geometry and quantity, different item-type representation: isolate scanning costs.
  for (const count of [100,300]) {
    cases.push({id:`quantity-${count}`,family:'quantity-scaling',input:{container:dims(20,20,20),items:[{...dims(2,2,2),quantity:count}]}});
    cases.push({id:`types-${count}`,family:'type-scaling',input:{container:dims(20,20,20),items:Array.from({length:count},(_,id)=>({id,...dims(2,2,2)}))}});
  }
  cases.push(mixed('mixed-24',24,19),mixed('mixed-48',48,19),mixed('mixed-96',96,19),mixed('rules-48',48,91,true));
  cases.push({id:'tiny-cubes-no-room',family:'tiny-exact',input:{container:dims(3,3,2),items:[{...dims(2,2,2),quantity:2,rotation:'fixed'}]},reference:{kind:'integer-grid'},quick:true});
  for (const seed of [5,17,29,41,53,67]) cases.push(tiny(`tiny-${seed}`,seed));
  // A constructive grid witness establishes global optimality without an expensive oracle.
  const cubes = cases.find(c=>c.id==='exact-cubes');
  cubes.reference={kind:'constructive-fill',witness:Array.from({length:64},(_,i)=>({id:0,itemIndex:0,instanceIndex:i,
    position:{x:(i%4)*2,y:(Math.floor(i/4)%4)*2,z:Math.floor(i/16)*2},dimensions:dims(2,2,2)}))};
  return cases;
}
module.exports = { corpus, tiling };
