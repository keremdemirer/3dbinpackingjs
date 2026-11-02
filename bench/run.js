#!/usr/bin/env node
'use strict';
const {Worker}=require('node:worker_threads');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
const {parseArgs}=require('node:util');
const {execFileSync}=require('node:child_process');
const {corpus}=require('./corpus.js');
const hash=value=>createHash('sha256').update(value).digest('hex');
function runCase(entry,{samples,warmup,timeoutMs}) {
  return new Promise(resolve=>{
    const worker=new Worker(path.join(__dirname,'worker.js'),{workerData:{entry,samples,warmup}});
    let settled=false;
    const finish=row=>{if(settled)return;settled=true;clearTimeout(timer);resolve(row);};
    const timer=setTimeout(()=>{worker.terminate();finish({ok:false,id:entry.id,error:`case exceeded ${timeoutMs} ms (including startup/warmup/validation)`});},timeoutMs);
    worker.once('message',row=>finish(row));
    worker.once('error',error=>finish({ok:false,id:entry.id,error:error.message}));
    worker.once('exit',code=>{if(!settled)finish({ok:false,id:entry.id,error:`worker exited without a result (${code})`});});
  });
}
function compareQuality(report,baseline) {
  if(!baseline || baseline.schemaVersion!==1 || !Array.isArray(baseline.cases) || baseline.cases.some(row=>!Number.isFinite(row.packedVolume)||row.packedVolume<0)) return ['Invalid quality baseline.'];
  if(report.corpusHash!==baseline.corpusHash) return ['Corpus differs; regenerate/review the quality baseline intentionally.'];
  const previous=new Map(baseline.cases.map(row=>[row.id,row]));
  const failures=[];
  for(const row of report.cases) {
    const old=previous.get(row.id);
    if(!row.ok) {failures.push(`${row.id}: ${row.error}`);continue;}
    if(!old || old.inputHash!==row.inputHash) {failures.push(`${row.id}: missing or changed baseline input`);continue;}
    if(row.packedVolume<old.packedVolume) failures.push(`${row.id}: packed volume ${old.packedVolume} → ${row.packedVolume}`);
  }
  return failures;
}
function qualityBaseline(report) {
  if(report.cases.some(row=>!row.ok)) throw new Error('Cannot baseline invalid/timed-out cases.');
  return {schemaVersion:1,corpusHash:report.corpusHash,solverHash:report.solverHash,
    cases:report.cases.map(({id,inputHash,packedVolume})=>({id,inputHash,packedVolume}))};
}
function markdown(report) {
  const percent=value=>value===null?'—':(value*100).toFixed(1)+'%';
  const lines=['# Performance and quality baseline','',
    `Runtime: ${report.environment.node}; ${report.environment.platform}/${report.environment.arch}; ${report.environment.cpu}.`,
    `Solver SHA-256: \`${report.solverHash}\`. Corpus SHA-256: \`${report.corpusHash}\`.`,
    `${report.parameters.samples} measured calls after ${report.parameters.warmup} warmups per case; pack() only is timed. Each case runs in a fresh worker.`,
    '', '| Case | Items / types | Packed | Utilization | Volume-bound coverage | Reference coverage | Base contact full / partial / none | Median ms | Sample p95 ms | Trials |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for(const row of report.cases) {
    if(!row.ok) {lines.push(`| ${row.id} | ERROR: ${row.error.split('\n')[0].replaceAll('|','/')} | | | | | | | | |`);continue;}
    lines.push(`| ${row.id} | ${row.instances} / ${row.types} | ${row.packedCount} | ${percent(row.utilization)} | ${percent(row.boundCoverage)} | ${percent(row.referenceCoverage)} | ${row.baseContact.full} / ${row.baseContact.partial} / ${row.baseContact.none} | ${row.timing.medianMs.toFixed(3)} | ${row.timing.p95Ms.toFixed(3)} | ${row.iterations} |`);
  }
  lines.push('','Volume-bound coverage uses min(container volume, requested volume), a relaxation that need not be attainable. Reference coverage is shown only for a validated full-container witness or a completed tiny integer-grid oracle. See JSON for reference kind, oracle states, raw samples, and environment details. Timings are observations on this machine, not portable budgets.');
  if(report.timingComparison?.length) {
    lines.push('', '## Observational timing comparison', '', 'Ratios below 1 indicate a lower median. These values never determine the quality gate; compare environments and repeat measurements before drawing conclusions.', '', '| Case | Previous median ms | Current median ms | Ratio |', '| --- | ---: | ---: | ---: |');
    for(const row of report.timingComparison) lines.push(`| ${row.id} | ${row.previousMedianMs.toFixed(3)} | ${row.medianMs.toFixed(3)} | ${row.ratio.toFixed(3)} |`);
  }
  return lines.join('\n')+'\n';
}
async function main() {
  const {values}=parseArgs({options:{quick:{type:'boolean'},samples:{type:'string'},warmup:{type:'string'},timeout:{type:'string'},output:{type:'string'},baseline:{type:'string'},'check-quality':{type:'boolean'},'write-baseline':{type:'string'},case:{type:'string'}}});
  const integer=(name,value,min)=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<min)throw new Error(`${name} must be an integer >= ${min}`);return n;};
  const parameters={samples:integer('samples',values.samples??(values.quick?'1':'7'),1),warmup:integer('warmup',values.warmup??(values.quick?'0':'2'),0),timeoutMs:integer('timeout',values.timeout??'30000',1)};
  const all=corpus();
  const entries=all.filter(entry=>(!values.quick||entry.quick)&&(!values.case||entry.id===values.case));
  if(!entries.length)throw new Error('No matching benchmark cases.');
  if(values.output && !values.output.endsWith('.json'))throw new Error('--output must end with .json.');
  if(values['check-quality']&&!values.baseline)throw new Error('--check-quality requires --baseline.');
  if(values['write-baseline']&&entries.length!==all.length)throw new Error('Quality baselines must cover the full corpus.');
  let commit=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(__dirname,'..'),encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}
  const report={schemaVersion:1,createdAt:new Date().toISOString(),gitCommit:commit,
    solverHash:hash(fs.readFileSync(path.join(__dirname,'../pack.js'))),corpusHash:hash(JSON.stringify(all)),
    environment:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length},parameters,cases:[]};
  for(const entry of entries) {
    const row=await runCase(entry,parameters);report.cases.push(row);
    console.error(row.ok?`${entry.id}: ${row.packedCount}/${row.instances}, ${(row.utilization*100).toFixed(1)}%, median ${row.timing.medianMs.toFixed(3)} ms`:`${entry.id}: FAILED ${row.error}`);
  }
  const baseline=values.baseline?JSON.parse(fs.readFileSync(values.baseline,'utf8')):null;
  report.regressions=baseline?compareQuality(report,baseline):[];
  if(baseline?.cases?.some(row=>row.timing) && baseline.corpusHash===report.corpusHash) {
    report.comparedEnvironment=baseline.environment;
    report.timingComparison=report.cases.filter(row=>row.ok).flatMap(row=>{
      const previous=baseline.cases.find(old=>old.id===row.id && old.inputHash===row.inputHash && old.timing?.medianMs>0);
      return previous?[{id:row.id,previousMedianMs:previous.timing.medianMs,medianMs:row.timing.medianMs,ratio:row.timing.medianMs/previous.timing.medianMs}]:[];
    });
  }
  if(values.output) {
    fs.mkdirSync(path.dirname(values.output),{recursive:true});fs.writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(values.output.replace(/\.json$/,'')+'.md',markdown(report));
  } else console.log(markdown(report));
  if(values['write-baseline']) fs.writeFileSync(values['write-baseline'],JSON.stringify(qualityBaseline(report),null,2)+'\n');
  if(report.cases.some(row=>!row.ok)||(values['check-quality']&&report.regressions.length)) {
    console.error(report.regressions.join('\n'));process.exitCode=1;
  }
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={runCase,compareQuality,qualityBaseline,markdown};
