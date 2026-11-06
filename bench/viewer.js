'use strict';
// CPU-side WebGL command benchmark. This does not measure GPU or browser frame time.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const os=require('node:os');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const baselineRef=process.argv[process.argv.indexOf('--baseline-ref')+1];
if(!process.argv.includes('--baseline-ref')||!baselineRef)throw Error('Usage: node bench/viewer.js --baseline-ref <commit>');
const baseline=execFileSync('git',['show',baselineRef+':demo/viewer.js'],{cwd:root,encoding:'utf8'});
const current=fs.readFileSync(path.join(root,'demo/viewer.js'),'utf8');
function hash(value){return crypto.createHash('sha256').update(value).digest('hex');}
function harness(source,capture=false) {
  let bound,uploads=0,bytes=0;const handlers={},buffers=new Map(),commands=[];
  const gl={isContextLost:()=>false,createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),
    getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),
    bindBuffer(_target,buffer){bound=buffer;},
    bufferData(_target,data){uploads++;bytes+=data.byteLength;if(capture)buffers.set(bound,Buffer.from(data.buffer,data.byteOffset,data.byteLength));},
    drawArrays(mode,start,count){if(capture)commands.push({mode,start,count,hash:hash(buffers.get(bound))});},
    TRIANGLES:4,LINES:1};
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','deleteShader','enable','depthFunc','enableVertexAttribArray','vertexAttribPointer','viewport','clearColor','clear','useProgram','polygonOffset','disable','uniformMatrix4fv'])gl[name]=()=>{};
  const canvas={width:800,height:400,getContext:()=>gl,getBoundingClientRect:()=>({left:0,top:0,width:800,height:400}),addEventListener:(name,fn)=>{handlers[name]=fn;},toBlob:callback=>callback({})};
  const context=vm.createContext({ResizeObserver:class{observe(){}}});vm.runInContext(source,context);
  const viewer=context.PackingView.create(canvas,()=>{},()=>{});
  return {viewer,commands,counts:()=>({uploads,bytes}),fire:(name)=>handlers[name]({preventDefault(){}})};
}
function load(count){return {container:{width:100,height:100,depth:100},placements:Array.from({length:count},(_,i)=>({itemIndex:i%8,position:{x:i%100,y:Math.floor(i/100)%100,z:Math.floor(i/10000)},dimensions:{width:1,height:1,depth:1}}))};}
// Compare actual vertex payloads at draw time, independently of buffer allocation strategy.
const parity=[];
for(const source of [baseline,current]) {
  const h=harness(source,true);h.viewer.setResult(load(17));h.viewer.select(7);h.viewer.zoom(1.1);h.viewer.reset();h.viewer.snapshot(()=>{});
  h.fire('webglcontextlost');h.fire('webglcontextrestored');h.viewer.setResult(load(2));h.viewer.setResult(null);
  parity.push(h.commands);
}
assert.deepEqual(parity[1],parity[0]);
const rows=[];
for(const count of [100,1000,10000]) {
  const samples={baseline:[],current:[]};
  for(let sample=0;sample<3;sample++)for(const name of sample%2?['current','baseline']:['baseline','current']) {
    const h=harness(name==='current'?current:baseline),value=load(count);
    const start=performance.now();h.viewer.setResult(value);const setupMs=performance.now()-start;
    h.viewer.zoom(1.001); // warm one camera update before measuring
    const before=h.counts(),t=performance.now();
    for(let frame=0;frame<20;frame++)h.viewer.zoom(frame%2?1/1.001:1.001);
    const cameraMs=performance.now()-t,after=h.counts();
    samples[name].push({setupMs,cameraMs,cameraUploads:after.uploads-before.uploads,cameraBytes:after.bytes-before.bytes});
  }
  rows.push({placements:count,frames:20,samples});
}
console.log(JSON.stringify({description:'CPU geometry and mocked WebGL command submission only; excludes GPU execution, browser layout and actual frame latency.',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0].model,baselineRef,baselineSourceSha256:hash(baseline),currentSourceSha256:hash(current),drawPayloadParity:true,rows},null,2));
