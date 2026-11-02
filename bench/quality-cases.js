'use strict';
const {corpus,tiling}=require('./corpus.js');
// These seeds were held out of the scoring-policy experiments.
function qualityCases() {
  const entries=corpus();
  for(const seed of [101,203,307,409,503,607,709,811,907,1009])for(const count of [12,24]) {
    const entry=tiling(`holdout-${count}-${seed}`,count,seed);
    entry.family='holdout-known-fill';entries.push(entry);
  }
  return entries;
}
module.exports={qualityCases};
