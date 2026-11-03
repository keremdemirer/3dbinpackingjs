const assert=require('node:assert/strict');
const {test}=require('node:test');
const {create}=require('../demo/runner.js');
function harness(factory) {
  const workers=[],tasks=new Map(),results=[],errors=[],states=[],modes=[];let timerId=0,solves=0;
  function makeWorker(){const w={terminated:0,postMessage(data){this.request=data;},terminate(){this.terminated++;}};workers.push(w);return w;}
  const runner=create({createWorker:factory===null?null:factory||makeWorker,
    defer(fn){tasks.set(++timerId,fn);return timerId;},clear(id){tasks.delete(id);},
    solve(input){solves++;if(input.fail)throw new Error('bad input');return {result:input,contact:{}};},
    onResult:r=>results.push(r),onError:e=>errors.push(e),onState:s=>states.push(s),onMode:b=>modes.push(b)});
  return {runner,workers,tasks,results,errors,states,modes,get solves(){return solves;},flush(){for(const [id,fn]of tasks){tasks.delete(id);fn();}}};
}
const reply=(w,value={value:1})=>w.onmessage({data:{id:w.request.id,ok:true,result:value,contact:{records:[]}}});
test('worker completion terminates the worker and restores idle controls exactly once',()=>{
  const h=harness();h.runner.run({a:1});const w=h.workers[0],handler=w.onmessage;
  assert.equal(h.runner.isBusy(),true);reply(w);assert.equal(w.terminated,1);
  assert.equal(h.runner.isBusy(),false);assert.equal(h.results.length,1);
  handler({data:{id:w.request.id,ok:true,result:{old:true},contact:{}}});assert.equal(h.results.length,1);
  assert.deepEqual(h.states.at(-1),{busy:false,background:true});
});
test('cancellation and superseding requests ignore already-queued old callbacks',()=>{
  const h=harness();h.runner.run({a:1});const a=h.workers[0],late=a.onmessage,lateError=a.onerror;
  h.runner.run({a:2});const b=h.workers[1];assert.notEqual(a.request.id,b.request.id);assert.equal(a.terminated,1);
  late({data:{id:a.request.id,ok:true,result:{old:true},contact:{}}});lateError({preventDefault(){}});
  assert.equal(h.runner.usesBackground(),true);assert.equal(h.results.length,0);assert.equal(h.errors.length,0);
  const lateB=b.onmessage;assert.equal(h.runner.cancel(),true);assert.equal(h.runner.cancel(),false);
  lateB({data:{id:b.request.id,ok:true,result:{old:true},contact:{}}});assert.equal(h.results.length,0);
  h.runner.run({a:3});reply(h.workers[2],{newest:true});assert.deepEqual(h.results[0].result,{newest:true});
});
test('mismatched request IDs cannot complete a current calculation',()=>{
  const h=harness();h.runner.run({});const w=h.workers[0];w.onmessage({data:{id:-1,ok:true,result:{},contact:{}}});
  assert.equal(h.runner.isBusy(),true);assert.equal(h.results.length,0);reply(w);assert.equal(h.results.length,1);
});
test('local fallback is explicit, deferred and can be cancelled before computation begins',()=>{
  const h=harness(null);h.runner.run({a:1});assert.equal(h.solves,0);assert.equal(h.modes.at(-1),false);
  assert.deepEqual(h.states.at(-1),{busy:true,background:false});const queued=[...h.tasks.values()][0];
  h.runner.cancel();queued();assert.equal(h.solves,0);
  h.runner.run({a:2});h.flush();assert.equal(h.results.length,1);assert.equal(h.solves,1);
  h.runner.run({fail:true});h.flush();assert.deepEqual(h.errors,['bad input']);assert.equal(h.runner.isBusy(),false);
});
test('worker construction failure selects the local fallback before solving',()=>{
  const h=harness(()=>{throw new Error('blocked');});h.runner.run({});assert.equal(h.solves,0);assert.equal(h.runner.usesBackground(),false);
  h.flush();assert.equal(h.results.length,1);assert.equal(h.errors.length,0);
});
test('runtime worker failure does not silently rerun synchronously; a later request may use local mode',()=>{
  const h=harness();h.runner.run({});const w=h.workers[0];let prevented=false;
  w.onerror({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(w.terminated,1);
  assert.equal(h.solves,0);assert.equal(h.runner.isBusy(),false);assert.match(h.errors[0],/Calculate again/);
  h.runner.run({});h.flush();assert.equal(h.solves,1);assert.equal(h.results.length,1);
});
test('message decoding and postMessage failures clean up without leaving the runner busy',()=>{
  const h=harness();h.runner.run({});h.workers[0].onmessageerror();assert.equal(h.runner.isBusy(),false);assert.equal(h.errors.length,1);
  const k=harness(()=>({terminate(){},postMessage(){throw new Error('clone');}}));k.runner.run({});assert.equal(k.runner.isBusy(),false);assert.equal(k.errors.length,1);
});
test('solver errors and malformed replies restore idle state without disabling healthy workers',()=>{
  const h=harness();h.runner.run({});const w=h.workers[0];w.onmessage({data:{id:w.request.id,ok:false,error:'Invalid dimensions'}});
  assert.deepEqual(h.errors,['Invalid dimensions']);assert.equal(h.runner.usesBackground(),true);
  h.runner.run({});const b=h.workers[1];b.onmessage({data:{id:b.request.id,ok:true,result:{}}});
  assert.match(h.errors.at(-1),/Invalid background/);assert.equal(h.runner.isBusy(),false);
  h.runner.run({});reply(h.workers[2]);assert.equal(h.results.length,1);
});
