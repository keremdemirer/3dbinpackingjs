const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pack } = require('3dbinpackingjs');

function validate(result, request) {
  assert.equal(result.totalCount, request.items.reduce((n,i)=>n+(i.quantity ?? 1),0));
  assert.equal(result.packedCount,result.placements.length);
  assert.equal(result.totalCount,result.placements.length+result.unpacked.length);
  const seen=new Set(); let volume=0;
  for (const item of [...result.placements,...result.unpacked]) {
    const original=request.items[item.itemIndex];
    assert.ok(original);
    assert.ok(item.instanceIndex>=0 && item.instanceIndex<(original.quantity ?? 1));
    const identity=`${item.itemIndex}:${item.instanceIndex}`;
    assert.ok(!seen.has(identity)); seen.add(identity);
    assert.equal(item.id,original.id ?? item.itemIndex);
    const rule=original.rotation ?? 'free';
    assert.equal(item.rotation,rule==='free'?undefined:rule);
    const d=[item.dimensions.width,item.dimensions.height,item.dimensions.depth];
    const w=original.width,h=original.height,z=original.depth;
    const allowed=rule==='fixed'?[[w,h,z]]:rule==='upright'?[[w,h,z],[z,h,w]]:
      [[w,h,z],[w,z,h],[h,w,z],[h,z,w],[z,w,h],[z,h,w]];
    if (!item.position) { assert.deepEqual(d,[w,h,z]); continue; }
    assert.ok(allowed.some(size=>size.every((v,i)=>v===d[i])),`illegal ${rule} rotation: ${d}`);
    const p=[item.position.x,item.position.y,item.position.z];
    const container=[request.container.width,request.container.height,request.container.depth];
    assert.ok(p.every((v,i)=>Number.isFinite(v) && v>=0 && v+d[i]<=container[i]));
    volume+=d[0]*d[1]*d[2];
  }
  for (let i=0;i<result.placements.length;i++) {
    const a=result.placements[i],p=[a.position.x,a.position.y,a.position.z],d=[a.dimensions.width,a.dimensions.height,a.dimensions.depth];
    for (let j=0;j<i;j++) {
      const b=result.placements[j],q=[b.position.x,b.position.y,b.position.z],e=[b.dimensions.width,b.dimensions.height,b.dimensions.depth];
      assert.ok(p.some((v,k)=>v+d[k]<=q[k]||q[k]+e[k]<=v),'overlapping constrained items');
    }
  }
  assert.equal(result.packedVolume,volume);
  return result;
}
function request(rotation, container={width:4,height:3,depth:2}) {
  return {container,items:[{id:'item',width:2,height:3,depth:4,rotation}]};
}

test('upright allows yaw but forbids tipping; fixed retains all original axes', () => {
  assert.equal(validate(pack(request('upright')),request('upright')).packedCount,1);
  assert.equal(validate(pack(request('fixed')),request('fixed')).packedCount,0);
  const tipped={width:4,height:2,depth:3};
  for (const rotation of ['free','upright','fixed']) {
    const input=request(rotation,tipped);
    assert.equal(validate(pack(input),input).packedCount,rotation==='free'?1:0);
  }
});

// Force one internal container variant at a time to catch constraints applied in
// internal coordinates rather than original world coordinates. Production uses all six.
for (let variant=1;variant<=6;variant++) {
  test(`rotation rules survive container-axis variant ${variant}`, () => {
    const source=fs.readFileSync(path.join(__dirname,'../pack.js'),'utf8');
    const loop='for (variant = 1; (variant <= 6) && !quit; variant++)';
    assert.ok(source.includes(loop));
    const context=vm.createContext({module:{exports:{}}});
    vm.runInContext(source.replace(loop,`for (variant = ${variant}; (variant <= ${variant}) && !quit; variant++)`),context);
    const solve=context.module.exports.pack;
    const cases=[
      [request('fixed',{width:2,height:3,depth:4}),1],
      [request('upright'),1],
      [request('fixed'),0],
      [request('upright',{width:4,height:2,depth:3}),0]
    ];
    for (const [input,count] of cases) {
      const result=JSON.parse(JSON.stringify(solve(input)));
      assert.equal(validate(result,input).packedCount,count);
    }
  });
}

test('free remains the exact default, including output shape', () => {
  const input={container:{width:8,height:7,depth:6},items:[{width:3,height:4,depth:2,quantity:8},{width:1,height:2,depth:5,quantity:4}]};
  const explicit={...input,items:input.items.map(i=>({...i,rotation:'free'}))};
  assert.deepEqual(pack(explicit),pack(input));
  assert.ok(!('rotation' in pack(input).placements[0]));
});

test('rules are independent per item and instance, with duplicate dimensions and IDs', () => {
  const input={container:{width:4,height:2,depth:3},items:['upright','free','fixed'].map(rotation=>
    ({id:'same',width:2,height:3,depth:4,rotation,quantity:2}))};
  const result=validate(pack(input),input);
  assert.equal(result.packedCount,1);
  assert.equal(result.placements[0].itemIndex,1);
  assert.equal(result.unpacked.length,5);
});

test('invalid rotation values are rejected rather than silently ignored', () => {
  for (const rotation of [null,false,0,'Upright','none',[],{},['fixed']]) {
    assert.throws(()=>pack(request(rotation)),{name:'TypeError',message:/rotation/});
  }
});

test('readonly constrained requests and interleaved calls do not share state', () => {
  const input=Object.freeze({container:Object.freeze({width:4,height:3,depth:2}),
    items:Object.freeze([Object.freeze({width:2,height:3,depth:4,rotation:'upright'})])});
  const before=JSON.stringify(input), expected=pack(input);
  pack(request('fixed')); pack(request('free'));
  assert.deepEqual(validate(pack(input),input),expected); assert.equal(JSON.stringify(input),before);
});

test('mixed-rule seeded cases obey orientation, identity, geometry, and totals', () => {
  let seed=0xface1234;
  function random(max) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed%max; }
  for (let i=0;i<300;i++) {
    const input={container:{width:random(9)+1,height:random(9)+1,depth:random(9)+1},items:[]};
    for (let n=random(6)+1;n>0;n--) input.items.push({id:'box',width:random(6)+1,height:random(6)+1,depth:random(6)+1,
      quantity:random(3)+1,rotation:['free','upright','fixed'][random(3)]});
    try { validate(pack(input),input); }
    catch(error) { error.message+=`; case ${i}: ${JSON.stringify(input)}`; throw error; }
  }
});

test('layer generation, continuation, and scoring use allowed heights', () => {
  const source=fs.readFileSync(path.join(__dirname,'../pack.js'),'utf8');
  const context=vm.createContext({module:{exports:{}}});
  vm.runInContext(source.replace('initialize();\nexeciterations();',
    'globalThis.inspect = function(code) { return eval(code); };\ninitialize();\nexeciterations();'),context);
  context.module.exports.pack({container:{width:5,height:5,depth:5},items:[{width:1,height:4,depth:2,rotation:'upright'}]});
  context.inspect('variant=1;px=5;py=5;pz=5;remainpy=5;boxlist[1].orientations=orientationsFor(boxlist[1],1);boxlist[1].packst=0;listcanditlayers()');
  assert.deepEqual(JSON.parse(context.inspect('JSON.stringify(layers.slice(1).map(l=>l.layerdim))')),[4]);
  assert.equal(context.inspect('heightDifference(boxlist[1],2)'),2);
  context.inspect('findlayer(3)'); assert.equal(context.inspect('layerthickness'),0);
});

test('a cubic container still tries different layer axes when items have rotation rules', () => {
  const source=fs.readFileSync(path.join(__dirname,'../pack.js'),'utf8');
  const context=vm.createContext({module:{exports:{}},visited:[]});
  vm.runInContext(source.replace('var listcanditlayers = function(){','var listcanditlayers = function(){ globalThis.visited.push(variant);'),context);
  context.module.exports.pack(request('fixed',{width:2,height:2,depth:2}));
  assert.deepEqual(Array.from(context.visited),[1,2,3,4,5,6]);
});

test('the browser adapter reads nested rotation controls and legacy forms still default to free', () => {
  const events=[];
  const rotation={value:'upright'};
  const fields={screen:{value:''},strxx:{value:'4'},stryy:{value:'3'},strzz:{value:'2'}};
  const row={children:Object.fromEntries(['lbl','dim1','dim2','dim3','boxn'].map((name,i)=>
    [name,{value:['Carton','2','3','4','1'][i]}])),querySelector:selector=>selector==='[name="rotation"]'?rotation:null};
  const context=vm.createContext({BinPacking:{pack},document:{getElementById:id=>fields[id],getElementsByClassName:()=>[row]},
    CustomEvent:function(type,options) { this.type=type;this.detail=options.detail; },dispatchEvent:event=>events.push(event)});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../pack1.js'),'utf8'),context);
  assert.equal(context.main(),0); assert.equal(events.at(-1).detail.packedCount,1);
  assert.equal(events.at(-1).detail.placements[0].rotation,'upright');
  rotation.value='fixed'; assert.equal(context.main(),0); assert.equal(events.at(-1).detail.packedCount,0);
  assert.equal(events.at(-1).detail.unpacked[0].rotation,'fixed');
  delete row.querySelector;
  assert.equal(context.main(),0); assert.equal(events.at(-1).detail.packedCount,1);
  assert.ok(!('rotation' in events.at(-1).detail.placements[0]));
});
