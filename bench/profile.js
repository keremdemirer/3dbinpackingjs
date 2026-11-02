'use strict';
const {parseArgs}=require('node:util');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const {pack}=require('../pack.js');
const {corpus}=require('./corpus.js');
const {validate}=require('./validate.js');
const {values}=parseArgs({options:{case:{type:'string',default:'mixed-48'},calls:{type:'string',default:'100'},warmup:{type:'string',default:'10'},summary:{type:'string'}}});
if(values.summary) {
  const profile=JSON.parse(fs.readFileSync(values.summary,'utf8'));
  const counts=new Map();for(const id of profile.samples)counts.set(id,(counts.get(id)??0)+1);
  const functions=new Map();
  for(const node of profile.nodes)if(node.callFrame.url.endsWith('/pack.js')){
    const name=node.callFrame.functionName||'(anonymous)';functions.set(name,(functions.get(name)??0)+(counts.get(node.id)??0));
  }
  console.log(JSON.stringify({solverHash:createHash('sha256').update(fs.readFileSync(require.resolve('../pack.js'))).digest('hex'),
    node:process.version,totalSamples:profile.samples.length,solverSamples:[...functions.values()].reduce((a,b)=>a+b,0),
    attribution:'Self samples; V8 inlining may attribute callee work to callers.',
    functions:[...functions].sort((a,b)=>b[1]-a[1]).map(([name,samples])=>({name,samples,percentOfTotal:samples/profile.samples.length*100}))},null,2));
} else {
  const calls=Number(values.calls),warmup=Number(values.warmup);
  if(!Number.isSafeInteger(calls)||calls<1||!Number.isSafeInteger(warmup)||warmup<0)throw new Error('Invalid call counts.');
  const entry=corpus().find(c=>c.id===values.case);if(!entry)throw new Error('Unknown case.');
  let result;
  for(let i=0;i<warmup+calls;i++)result=pack(entry.input);
  validate(entry.input,result);
  console.error(`${entry.id}: ${warmup} warmups + ${calls} calls; final result validated. Profile includes startup and warmups.`);
}
