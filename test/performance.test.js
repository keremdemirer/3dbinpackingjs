const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHash}=require('node:crypto');
const {pack}=require('3dbinpackingjs');
const {parityCases}=require('../bench/performance-cases.js');
const {validate}=require('../bench/validate.js');
const fixture=require('./fixtures/performance-parity.json');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
test('performance optimizations preserve complete results from the merged reference solver',()=>{
  const entries=parityCases();
  assert.equal(entries.length,fixture.cases.length);
  entries.forEach((entry,i)=>{
    const expected=fixture.cases[i];assert.equal(entry.id,expected.id);assert.equal(hash(entry.input),expected.inputHash);
    const result=pack(entry.input);validate(entry.input,result);
    assert.equal(hash(result),expected.resultHash,entry.id+' complete result, including placements, identities and search trials');
  });
});
test('quantity cursors are isolated across interleaved calls and returned-object mutation',()=>{
  const entries=parityCases();const a=entries.find(e=>e.id==='issue-6');const b=entries.find(e=>e.id==='rules-48');
  const expected=hash(pack(a.input));const result=pack(a.input);
  result.placements[0].position.y=-100;pack(b.input);pack({container:{width:1,height:1,depth:1},items:[]});
  assert.equal(hash(pack(a.input)),expected);
});
