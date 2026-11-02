const assert = require('node:assert/strict');
const { test } = require('node:test');
const view = require('../demo/viewer.js');
const { pack } = require('3dbinpackingjs');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const camera = { yaw: 0, pitch: 0, zoom: 1, panX: 0, panY: 0 };
function close(actual, expected) { assert.ok(Math.abs(actual-expected)<1e-9, `${actual} != ${expected}`); }
function dot(a,b) { return a.reduce((v,x,i)=>v+x*b[i],0); }
function center(bounds) { return bounds.min.map((x,i)=>(x+bounds.max[i])/2); }

test('camera basis stays orthonormal while orbiting above and below the load', () => {
  for (const yaw of [-Math.PI, -1, 0, 1, Math.PI]) {
    for (const pitch of [-1.4, 0, 1.4]) {
      const b=view.basis({ yaw, pitch });
      for (const vector of Object.values(b)) close(dot(vector,vector),1);
      close(dot(b.right,b.up),0); close(dot(b.right,b.toward),0); close(dot(b.up,b.toward),0);
    }
  }
});

test('coordinates use original axes and one uniform scale for non-cubic containers', () => {
  const result={container:{width:12,height:10,depth:8}};
  const box=view.bounds(result,{position:{x:6,y:5,z:4},dimensions:{width:3,height:2,depth:1}});
  assert.deepEqual(box.min,[0,0,0]);
  close(box.max[0],3/12); close(box.max[1],2/12); close(box.max[2],1/12);
  const p=view.project([0,0,0],camera,800,400);
  assert.deepEqual(p,[400,200]);
});

test('picking selects the front box rather than an occluded instance in either direction', () => {
  const result=pack({container:{width:1,height:1,depth:2},items:[{width:1,height:1,depth:1,quantity:2}]});
  const front=result.placements.findIndex(i=>i.position.z===1);
  const back=result.placements.findIndex(i=>i.position.z===0);
  assert.equal(view.pick(result,camera,800,400,400,200),front);
  assert.equal(view.pick(result,{...camera,yaw:Math.PI},800,400,400,200),back);
  assert.equal(view.pick(result,camera,800,400,0,0),-1);
  assert.equal(view.pick(null,camera,800,400,400,200),-1);
});

test('projecting and picking agree after orbit, pan, zoom, and viewport changes', () => {
  const result=pack({container:{width:3,height:2,depth:4},items:[{width:1,height:1,depth:1}]});
  for (const size of [[1000,500],[360,500]]) {
    for (const yaw of [-2.5,-1,0,1.2,2.7]) {
      const c={...camera,yaw,pitch:0.7,zoom:1.8,panX:0.13,panY:-0.1};
      const p=view.project(center(view.bounds(result,result.placements[0])),c,...size);
      assert.equal(view.pick(result,c,...size,...p),0);
    }
  }
});

test('ray picking handles directions parallel to box faces and empty loads', () => {
  const result=pack({container:{width:2,height:2,depth:2},items:[{width:1,height:1,depth:1}]});
  for (const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const c={...camera,yaw};
    const p=view.project(center(view.bounds(result,result.placements[0])),c,800,400);
    assert.equal(view.pick(result,c,800,400,...p),0);
  }
  assert.equal(view.pick({...result,placements:[]},camera,800,400,400,200),-1);
});

test('palette is stable by item type, including repeated colors for large type lists', () => {
  assert.match(view.colorFor(0),/^#[a-f0-9]{6}$/);
  assert.notEqual(view.colorFor(0),view.colorFor(1));
  assert.equal(view.colorFor(0),view.colorFor(8));
});

test('legacy form adapter emits successful results and input errors for the demo', () => {
  const events=[];
  const fields={screen:{value:''},strxx:{value:'1'},stryy:{value:'1'},strzz:{value:'1'}};
  const row={children:Object.fromEntries(['lbl','dim1','dim2','dim3','boxn'].map((k,i)=>[k,{value:i?'1':'<label>'}]))};
  const context=vm.createContext({
    BinPacking:{pack}, document:{getElementById:id=>fields[id],getElementsByClassName:()=>[row]},
    CustomEvent:function(type,options) { this.type=type; this.detail=options.detail; },
    dispatchEvent:event=>events.push(event)
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../pack1.js'),'utf8'),context);
  assert.equal(context.main(),0);
  assert.equal(events[0].type,'packing:result'); assert.equal(events[0].detail.placements[0].id,'<label>');
  fields.settle={checked:true};
  assert.equal(context.main(),0);
  assert.deepEqual(events.at(-1).detail.diagnostics.settling,{movedCount:0,totalDrop:0});
  fields.settle.checked=false;
  assert.equal(context.main(),0);
  assert.equal(events.at(-1).detail.diagnostics.settling,undefined);
  fields.strxx.value='0';
  assert.equal(context.main(),1);
  assert.equal(events.at(-1).type,'packing:error'); assert.match(events.at(-1).detail,/positive/);
});

function viewerHarness(available=true) {
  const handlers={}, selected=[], messages=[], matrices=[];
  const gl={isContextLost:()=>false,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
    getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),
    uniformMatrix4fv:(_location,_transpose,matrix)=>matrices.push(Array.from(matrix))};
  for (const name of ['shaderSource','compileShader','attachShader','linkProgram','deleteShader','enable','depthFunc',
    'bindBuffer','bufferData','enableVertexAttribArray','vertexAttribPointer','drawArrays','viewport',
    'clearColor','clear','useProgram','polygonOffset','disable']) gl[name]=()=>{};
  const captured=new Set();
  const canvas={width:800,height:400,getContext:()=>available?gl:null,
    getBoundingClientRect:()=>({left:0,top:0,width:800,height:400}),
    addEventListener:(name,fn)=>handlers[name]=fn,focus(){},
    setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id),
    toBlob:callback=>callback({type:'image/png'})};
  const context=vm.createContext({ResizeObserver:class { observe() {} }});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../demo/viewer.js'),'utf8'),context);
  const viewer=context.PackingView.create(canvas,index=>selected.push(index),message=>messages.push(message));
  viewer.setResult(pack({container:{width:1,height:1,depth:2},items:[{width:1,height:1,depth:1,quantity:2}]}));
  function fire(name,values={}) { handlers[name]({preventDefault(){},pointerId:1,clientX:400,clientY:200,buttons:1,...values}); }
  return {viewer,fire,selected,messages,matrices,last:()=>matrices.at(-1)};
}

test('pointer dragging orbits without selecting, while a click selects a box', () => {
  const h=viewerHarness(); const initial=h.last();
  h.fire('pointerdown'); h.fire('pointermove',{clientX:470}); h.fire('pointerup',{clientX:470});
  assert.notDeepEqual(h.last(),initial); assert.equal(h.selected.length,0);
  h.viewer.reset(); assert.deepEqual(h.last(),initial);
  h.fire('pointerdown'); h.fire('pointerup'); assert.equal(h.selected.length,1); assert.ok(h.selected[0]>=0);
});

test('keyboard pan, zoom, reset, and two-pointer gestures update the camera', () => {
  const h=viewerHarness(); const initial=h.last();
  h.fire('keydown',{key:'ArrowUp',shiftKey:true}); assert.notEqual(h.last()[13],initial[13]);
  h.fire('keydown',{key:'+'}); assert.ok(Math.abs(h.last()[0])>Math.abs(initial[0]));
  h.fire('keydown',{key:'0'}); assert.deepEqual(h.last(),initial);
  h.fire('pointerdown',{clientX:350}); h.fire('pointerdown',{pointerId:2,clientX:450});
  h.fire('pointermove',{pointerId:2,clientX:550}); assert.ok(Math.abs(h.last()[0])>Math.abs(initial[0]));
  h.fire('pointerup',{pointerId:2,clientX:550}); h.fire('pointerup',{clientX:350}); assert.equal(h.selected.length,0);
});

test('snapshot uses PNG blobs and a missing WebGL context has a usable fallback', () => {
  const active=viewerHarness(); let blob;
  active.viewer.snapshot(value=>blob=value); assert.equal(blob.type,'image/png');
  const fallback=viewerHarness(false);
  assert.match(fallback.messages[0],/unavailable/);
  fallback.viewer.snapshot(value=>blob=value); assert.equal(blob,null);
  fallback.viewer.reset(); fallback.viewer.zoom(1.2); fallback.viewer.select(0);
});
