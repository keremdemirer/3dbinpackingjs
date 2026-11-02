#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {parseArgs}=require('node:util');
const {corpus}=require('./corpus.js');
const {runCase}=require('./run.js');
async function main() {
  const {values}=parseArgs({options:{samples:{type:'string'},warmup:{type:'string'},output:{type:'string'}}});
  const samples=Number(values.samples??7),warmup=Number(values.warmup??2);
  if(!Number.isSafeInteger(samples)||samples<1||!Number.isSafeInteger(warmup)||warmup<0) throw new Error('Invalid sample/warmup count.');
  if(values.output&&!values.output.endsWith('.json')) throw new Error('--output must end with .json.');
  const entries=corpus();
  const upright=structuredClone(entries.find(e=>e.id==='reported-overhang'));
  upright.id='reported-upright-gap';upright.input.items[1].rotation='upright';entries.push(upright);
  const cases=[];
  for(const entry of entries) {
    const before=await runCase(entry,{samples,warmup,timeoutMs:30000});
    const after=await runCase({...entry,input:{...entry.input,settle:true}},{samples,warmup,timeoutMs:30000});
    assert.ok(before.ok, before.error);assert.ok(after.ok,after.error);
    assert.equal(after.packedVolume,before.packedVolume,entry.id+': volume changed');
    assert.equal(after.packedCount,before.packedCount,entry.id+': count changed');
    assert.equal(after.baseContact.none,0,entry.id+': floating box remains');
    cases.push({id:entry.id,before,after});
    console.log(`${entry.id}: volume unchanged; no contact ${before.baseContact.none} → ${after.baseContact.none}`);
  }
  const report={createdAt:new Date().toISOString(),environment:{node:process.version,v8:process.versions.v8,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model},
    solverHash:createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../pack.js'))).digest('hex'),parameters:{samples,warmup,timeoutMs:30000},cases};
  if(values.output) {
    fs.mkdirSync(path.dirname(values.output),{recursive:true});fs.writeFileSync(values.output,JSON.stringify(report,null,2)+'\n');
    const lines=['# Optional settling comparison','',`Runtime: ${report.environment.node}; ${report.environment.platform}/${report.environment.arch}; ${report.environment.cpu}.`,
      `${samples} measured calls after ${warmup} warmups. Each mode/case uses a fresh worker. Both modes validate every result. Timings include search; settled timings include the post-pass.`,
      '','All packed volumes and counts are unchanged. Timings are observational; sequential mode measurements and JIT/GC noise can dominate small differences.',
      '','| Case | Packed volume | No contact before → after | Partial contact before → after | Median ms before → after |',
      '| --- | ---: | ---: | ---: | ---: |'];
    cases.forEach(({id,before,after})=>lines.push(`| ${id} | ${after.packedVolume} | ${before.baseContact.none} → ${after.baseContact.none} | ${before.baseContact.partial} → ${after.baseContact.partial} | ${before.timing.medianMs.toFixed(3)} → ${after.timing.medianMs.toFixed(3)} |`));
    lines.push('','Zero absent contact does not certify stability or full support. See JSON for input hashes, raw samples and reference information.');
    fs.writeFileSync(values.output.replace(/\.json$/,'.md'),lines.join('\n')+'\n');
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
