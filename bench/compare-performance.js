#!/usr/bin/env node
'use strict';
const {isMainThread,parentPort,workerData,Worker}=require('node:worker_threads');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {performance}=require('node:perf_hooks');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const {parseArgs}=require('node:util');
const {parityCases}=require('./performance-cases.js');
const {validate}=require('./validate.js');
const hash=x=>createHash('sha256').update(x).digest('hex');
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
if(!isMainThread) {
  try {
    const {source,input,samples,warmup}=workerData,{pack}=require(source);
    const inputHash=hash(JSON.stringify(input)),times=[];let resultHash;
    for(let i=0;i<warmup+samples;i++) {
      const start=performance.now();const result=pack(input);const elapsed=performance.now()-start;
      validate(input,result);assert.equal(hash(JSON.stringify(input)),inputHash,'input mutated');
      const current=hash(JSON.stringify(result));if(resultHash)assert.equal(current,resultHash,'nondeterministic output');resultHash=current;
      if(i>=warmup)times.push(elapsed);
    }
    parentPort.postMessage({times,medianMs:median(times),resultHash});
  }catch(error){parentPort.postMessage({error:error.stack});}
} else {
  function measure(source,input,samples,warmup) {
    return new Promise((resolve,reject)=>{
      const worker=new Worker(__filename,{workerData:{source,input,samples,warmup}});
      let settled=false;
      const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
      const timer=setTimeout(()=>{worker.terminate();finish(new Error('Comparison worker exceeded 30s.'));},30000);
      worker.once('message',value=>finish(value.error?new Error(value.error):null,value));
      worker.once('error',error=>finish(error));
      worker.once('exit',code=>{if(!settled)finish(new Error('Comparison worker exited without a result ('+code+').'));});
    });
  }
  async function main() {
    const {values}=parseArgs({options:{'baseline-source':{type:'string'},output:{type:'string'},samples:{type:'string'},warmup:{type:'string'},rounds:{type:'string'}}});
    if(!values['baseline-source'])throw new Error('--baseline-source must point to a trusted baseline pack.js checkout.');
    if(values.output&&!values.output.endsWith('.json'))throw new Error('--output must end with .json.');
    const parameters={samples:Number(values.samples??15),warmup:Number(values.warmup??20),rounds:Number(values.rounds??3)};
    for(const [k,v] of Object.entries(parameters))if(!Number.isSafeInteger(v)||v<(k==='warmup'?0:1))throw new Error('Invalid '+k);
    const beforeSource=path.resolve(values['baseline-source']),afterSource=path.resolve(__dirname,'../pack.js');
    const ids=['quantity-100','quantity-300','quantity-1000','quantity-3000','types-300','issue-6','mixed-48','rules-48','cut-fill-24','exact-cubes'];
    const entries=parityCases().filter(e=>ids.includes(e.id));const cases=[];
    for(const entry of entries) {
      const rounds=[];
      for(let round=0;round<parameters.rounds;round++) {
        const order=round%2?['after','before']:['before','after'],r={order};
        for(const mode of order)r[mode]=await measure(mode==='before'?beforeSource:afterSource,entry.input,parameters.samples,parameters.warmup);
        assert.equal(r.before.resultHash,r.after.resultHash,entry.id+': complete output changed');rounds.push(r);
      }
      const beforeMs=median(rounds.flatMap(r=>r.before.times)),afterMs=median(rounds.flatMap(r=>r.after.times));
      cases.push({id:entry.id,inputHash:hash(JSON.stringify(entry.input)),beforeMs,afterMs,speedup:beforeMs/afterMs,rounds});
      console.log(`${entry.id}: ${beforeMs.toFixed(3)} → ${afterMs.toFixed(3)} ms (${(beforeMs/afterMs).toFixed(2)}×)`);
    }
    const report={environment:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model},createdAt:new Date().toISOString(),parameters,
      beforeSolverHash:hash(fs.readFileSync(beforeSource)),afterSolverHash:hash(fs.readFileSync(afterSource)),cases};
    if(values.output) {
      fs.mkdirSync(path.dirname(values.output),{recursive:true});fs.writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
      const lines=['# Solver performance comparison','',`Runtime: ${report.environment.node}; ${report.environment.platform}/${report.environment.arch}; ${report.environment.cpu}.`,
        `${parameters.rounds} rounds; ${parameters.warmup} warmups + ${parameters.samples} samples per mode/case in a fresh worker. Mode order alternates each round. Only pack() is timed; every result is validated outside timing and complete result hashes must match.`,
        '','Medians pool measured samples across rounds. Speedup >1 indicates faster in this run; timings are machine-dependent observations, not CI budgets. Inspect individual round samples before generalizing.',
        '','| Case | Before median ms | After median ms | Speedup |','| --- | ---: | ---: | ---: |'];
      cases.forEach(r=>lines.push(`| ${r.id} | ${r.beforeMs.toFixed(3)} | ${r.afterMs.toFixed(3)} | ${r.speedup.toFixed(2)}× |`));
      fs.writeFileSync(values.output.replace(/\.json$/,'.md'),lines.join('\n')+'\n');
    }
  }
  main().catch(error=>{console.error(error.stack);process.exitCode=1;});
}
