#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
const {parseArgs}=require('node:util');
const {qualityCases}=require('./quality-cases.js');
const {runCase}=require('./run.js');
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
async function main() {
  const {values}=parseArgs({options:{samples:{type:'string'},warmup:{type:'string'},rounds:{type:'string'},output:{type:'string'}}});
  const parameters={samples:Number(values.samples??7),warmup:Number(values.warmup??2),rounds:Number(values.rounds??3),timeoutMs:30000};
  for(const name of ['samples','warmup','rounds'])assert.ok(Number.isSafeInteger(parameters[name])&&parameters[name]>=(name==='warmup'?0:1),'invalid '+name);
  if(values.output&&!values.output.endsWith('.json'))throw new Error('--output must end with .json.');
  const entries=qualityCases(),cases=[];
  for(const entry of entries) {
    const rounds=[];
    for(let i=0;i<parameters.rounds;i++) {
      const order=i%2?['extended','standard']:['standard','extended'],round={order};
      for(const mode of order) {
        const row=await runCase({...entry,input:mode==='standard'?entry.input:{...entry.input,search:'extended'}},parameters);
        assert.ok(row.ok,row.error);round[mode]=row;
      }
      assert.ok(round.extended.packedVolume>=round.standard.packedVolume,entry.id+': packed-volume regression');
      assert.ok(round.extended.iterations<=round.standard.iterations*2,entry.id+': trial budget');rounds.push(round);
    }
    for(const mode of ['standard','extended'])assert.ok(rounds.every(r=>r[mode].resultHash===rounds[0][mode].resultHash),entry.id+': nondeterministic rounds');
    const standard=rounds[0].standard,extended=rounds[0].extended;
    const standardMs=median(rounds.flatMap(r=>r.standard.timing.samples)),extendedMs=median(rounds.flatMap(r=>r.extended.timing.samples));
    cases.push({id:entry.id,family:entry.family,standardVolume:standard.packedVolume,extendedVolume:extended.packedVolume,
      standardUtilization:standard.utilization,extendedUtilization:extended.utilization,standardMs,extendedMs,passes:extended.search.passes,rounds});
    console.log(`${entry.id}: ${standard.packedVolume} → ${extended.packedVolume}; ${standardMs.toFixed(3)} → ${extendedMs.toFixed(3)} ms`);
  }
  const improved=cases.filter(r=>r.extendedVolume>r.standardVolume);
  const report={schemaVersion:1,createdAt:new Date().toISOString(),environment:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model},
    solverHash:createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../pack.js'))).digest('hex'),
    corpusHash:createHash('sha256').update(JSON.stringify(entries)).digest('hex'),parameters,
    summary:{cases:cases.length,improved:improved.length,holdoutImproved:improved.filter(r=>r.family==='holdout-known-fill').length,regressed:0},cases};
  if(values.output) {
    fs.mkdirSync(path.dirname(values.output),{recursive:true});fs.writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
    const lines=['# Standard versus extended search','',`Runtime: ${report.environment.node}; ${report.environment.platform}/${report.environment.arch}; ${report.environment.cpu}.`,
      `${parameters.rounds} alternating-order rounds, ${parameters.warmup} warmups and ${parameters.samples} samples per mode/case in fresh workers. Only pack() is timed; every result is independently validated afterward.`,
      '',`${cases.length} cases: ${improved.length} improved (${report.summary.holdoutImproved} held-out known fills), no packed-volume regressions. A maximum of two search passes is not a wall-clock deadline or an optimality guarantee.`,
      '','| Case | Volume standard → extended | Utilization standard → extended | Median ms standard → extended | Passes |',
      '| --- | ---: | ---: | ---: | ---: |'];
    cases.forEach(r=>lines.push(`| ${r.id} | ${r.standardVolume} → ${r.extendedVolume} | ${(r.standardUtilization*100).toFixed(1)}% → ${(r.extendedUtilization*100).toFixed(1)}% | ${r.standardMs.toFixed(3)} → ${r.extendedMs.toFixed(3)} | ${r.passes} |`));
    lines.push('','The 12-piece known-fill gap is closed; the original 24-piece gap remains at 91.875%. Equal-volume results keep the standard winner. Objective is packed volume, not count or stability. Timing observations are machine-dependent; see JSON for raw samples, source/input hashes, references, trial counts and base-contact diagnostics.');
    fs.writeFileSync(values.output.replace(/\.json$/,'.md'),lines.join('\n')+'\n');
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
