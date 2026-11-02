const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../pack.js'),'utf8');

// Test-only access follows the existing focused layer/skyline regression harness.
function harness(input) {
  const context=vm.createContext({module:{exports:{}}});
  const marker='initialize();\nexeciterations();';assert.ok(source.includes(marker));
  vm.runInContext(source.replace(marker,'globalThis.inspect = function(code) { return eval(code); };\n'+marker),context);
  context.module.exports.pack(input);return context;
}
function expectedLayer(boxes,thickness,px,pz) {
  let chosen=0,best=Infinity;
  boxes.forEach((box,i)=>{
    if(box.packed)return;
    for(const height of box.dimensions) {
      if(height>thickness || !box.orientations.some(d=>d[1]===height&&d[0]<=px&&d[2]<=pz))continue;
      let score=0;
      boxes.forEach((other,j)=>{
        if(i===j||other.packed)return;
        const heights=other.rotation==='free'?other.dimensions:other.orientations.map(d=>d[1]);
        score+=Math.min(...heights.map(h=>Math.abs(height-h)));
      });
      if(score<best){chosen=height;best=score;}
    }
  });
  return chosen;
}
test('layer cache matches uncached ordered scoring as flags, thickness and all six variants change',()=>{
  const input={container:{width:9,height:8,depth:7},items:[
    {width:1,height:4,depth:2,rotation:'upright',quantity:3},
    {width:2,height:3,depth:4,rotation:'fixed',quantity:2},
    {width:4,height:2,depth:3,quantity:4},
    {width:2,height:2,depth:2,quantity:2},
    {width:12,height:3,depth:2,rotation:'fixed'}
  ]};
  const context=harness(input);
  const variants=[[9,8,7],[7,8,9],[7,9,8],[8,9,7],[9,7,8],[8,7,9]];
  variants.forEach(([px,py,pz],i)=>{
    context.inspect(`variant=${i+1};px=${px};py=${py};pz=${pz};remainpy=py;for(x=1;x<=tbn;x++)boxlist[x].orientations=orientationsFor(boxlist[x],variant);`);
    for(let state=0;state<12;state++) {
      context.inspect(`for(x=1;x<=tbn;x++)boxlist[x].packst=${state}===11?1:((x*7+${state})%5<2?1:0);`);
      const boxes=JSON.parse(context.inspect('JSON.stringify(boxlist.slice(1,tbn+1).map(b=>({dimensions:[b.dim1,b.dim2,b.dim3],orientations:b.orientations,rotation:b.rotation,packed:b.packst})))'));
      for(const thickness of [0,1,2,3,4,8]) {
        const expected=expectedLayer(boxes,thickness,px,pz);
        context.inspect(`packing=1;findlayer(${thickness})`);
        assert.equal(context.inspect('layerthickness'),expected,`variant ${i+1}, state ${state}, thickness ${thickness}`);
        assert.equal(context.inspect('packing'),expected===0||expected>py?0:1);
      }
    }
  });
});
test('cached layer scores preserve floating-point addition and tie ordering',()=>{
  const context=harness({container:{width:2,height:2,depth:2},items:[
    {width:0.1,height:0.2,depth:0.3,quantity:3},
    {width:0.2,height:0.3,depth:0.4,quantity:2,rotation:'upright'},
    {width:0.3,height:0.4,depth:0.1,quantity:3,rotation:'fixed'}
  ]});
  context.inspect('variant=1;px=2;py=2;pz=2;remainpy=2;for(x=1;x<=tbn;x++){boxlist[x].packst=0;boxlist[x].orientations=orientationsFor(boxlist[x],1);}');
  const boxes=JSON.parse(context.inspect('JSON.stringify(boxlist.slice(1,tbn+1).map(b=>({dimensions:[b.dim1,b.dim2,b.dim3],orientations:b.orientations,rotation:b.rotation,packed:b.packst})))'));
  for(const thickness of [0.1,0.2,0.3,0.4,2]) {
    context.inspect(`findlayer(${thickness})`);
    assert.equal(context.inspect('layerthickness'),expectedLayer(boxes,thickness,2,2));
  }
});
