const assert=require('node:assert/strict');
const {test}=require('node:test');
const {Worker}=require('node:worker_threads');
const {once}=require('node:events');
const path=require('node:path');
const {pack}=require('3dbinpackingjs');
const {analyze}=require('../demo/support.js');
const {validate}=require('../bench/validate.js');
const {corpus}=require('../bench/corpus.js');
test('actual worker message protocol runs the shipped solver/support scripts and preserves API results',async()=>{
  const worker=new Worker(`
    const {parentPort,workerData}=require('node:worker_threads');
    const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
    let context;
    context=vm.createContext({self:{postMessage:data=>parentPort.postMessage(data)},importScripts:(...urls)=>{
      for(const url of urls)vm.runInContext(fs.readFileSync(path.resolve(workerData,'demo',url),'utf8'),context);
    }});
    vm.runInContext(fs.readFileSync(path.join(workerData,'demo/packing-worker.js'),'utf8'),context);
    parentPort.on('message',data=>context.self.onmessage({data}));
  `,{eval:true,workerData:path.resolve(__dirname,'..')});
  async function request(id,input){const response=once(worker,'message');worker.postMessage({id,input});return (await response)[0];}
  try {
    const entries=corpus().filter(e=>['reported-overhang','cut-fill-12','cut-fill-24','upright-swap','fixed-no-fit'].includes(e.id));
    let id=0;
    for(const entry of entries)for(const search of ['standard','extended'])for(const settle of [false,true]) {
      const input={...entry.input,search,settle},expected=pack(input);const reply=await request(++id,input);
      assert.equal(reply.id,id);assert.equal(reply.ok,true);assert.deepEqual(reply.result,expected);
      assert.deepEqual(reply.contact,analyze(expected));validate(input,reply.result);
    }
    const bad=await request(++id,{container:{width:0,height:1,depth:1},items:[]});assert.equal(bad.id,id);assert.equal(bad.ok,false);assert.match(bad.error,/positive finite/);
    const good=await request(++id,{container:{width:1,height:1,depth:1},items:[]});assert.equal(good.ok,true);assert.equal(good.result.packedCount,0);
  } finally {await worker.terminate();}
});
