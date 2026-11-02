'use strict';
const {parentPort,workerData}=require('node:worker_threads');
const {performance}=require('node:perf_hooks');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const {pack}=require('../pack.js');
const {validate}=require('./validate.js');
const {exactGrid}=require('./exact.js');
const {analyze}=require('../demo/support.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const percentile=(values,p)=>values[Math.ceil(values.length*p)-1];
try {
  const {entry,samples,warmup}=workerData;
  const input=entry.input, inputHash=hash(input);
  let reference=null;
  if(entry.reference?.kind==='constructive-fill') {
    const volume=input.container.width*input.container.height*input.container.depth;
    validate(input,{container:{...input.container},placements:entry.reference.witness,unpacked:[],
      totalCount:entry.reference.witness.length,packedCount:entry.reference.witness.length,
      containerVolume:volume,totalItemVolume:volume,packedVolume:volume,utilization:1});
    reference={kind:'proven-full-container',complete:true,volume};
  } else if(entry.reference?.kind==='integer-grid') reference={kind:'integer-grid-optimum',...exactGrid(input)};
  const times=[];let fingerprint,quality,result;
  for(let i=0;i<warmup+samples;i++) {
    const start=performance.now(); result=pack(input); const elapsed=performance.now()-start;
    quality=validate(input,result);
    assert.equal(hash(input),inputHash,'solver mutated benchmark input');
    const current=hash(result);
    if(fingerprint) assert.equal(current,fingerprint,'nondeterministic result between repeated runs');
    fingerprint=current;
    if(i>=warmup) times.push(elapsed);
  }
  const sorted=[...times].sort((a,b)=>a-b);
  if(reference?.complete) assert.ok(quality.packedVolume<=reference.volume,'heuristic exceeded the reference optimum');
  const contact=analyze(result);
  const baseContact={full:contact.fullContact,partial:contact.partialContact,none:contact.noContact};
  parentPort.postMessage({ok:true,id:entry.id,family:entry.family,inputHash,
    instances:result.totalCount,types:input.items.length,...quality,baseContact,
    boundCoverage:quality.volumeUpperBound?quality.packedVolume/quality.volumeUpperBound:1,
    reference,referenceCoverage:reference?.complete?(reference.volume?quality.packedVolume/reference.volume:1):null,
    iterations:result.diagnostics.iterations,...(result.diagnostics.search?{search:result.diagnostics.search}:{}),resultHash:fingerprint,
    timing:{samples:times,medianMs:percentile(sorted,0.5),p95Ms:percentile(sorted,0.95),minMs:sorted[0]}});
} catch(error) {parentPort.postMessage({ok:false,id:workerData.entry.id,error:error.stack});}
