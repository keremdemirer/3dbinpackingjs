/// <reference path="../pack.d.ts" />

// A script that loads pack.js can use the declared browser namespace.
const browserResult: BinPacking.PackResult = BinPacking.pack({
  container: { width: 1, height: 2, depth: 3 },
  items: [{ width: 1, height: 2, depth: 3 }]
});
const percentage: number = browserResult.utilization * 100;
void percentage;
// @ts-expect-error There is no asynchronous packing method.
BinPacking.packAsync({});
