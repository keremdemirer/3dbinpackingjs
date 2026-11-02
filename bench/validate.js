'use strict';
const assert = require('node:assert/strict');

// Independent of pack.js: validate instances, allowed dimensions, geometry, and totals.
function validate(input, result) {
  const container = input.container;
  const totalCount = input.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const totalVolume = input.items.reduce((sum, item) => sum + item.width * item.height * item.depth * (item.quantity ?? 1), 0);
  assert.equal(result.totalCount, totalCount);
  assert.equal(result.packedCount, result.placements.length);
  assert.equal(result.placements.length + result.unpacked.length, totalCount);
  assert.deepEqual(result.container, container);
  assert.equal(result.containerVolume, container.width * container.height * container.depth);
  assert.equal(result.totalItemVolume, totalVolume);
  const seen = new Set();
  let packedVolume = 0;
  for (const item of [...result.placements, ...result.unpacked]) {
    assert.ok(Number.isInteger(item.itemIndex) && item.itemIndex >= 0 && item.itemIndex < input.items.length, 'unknown item');
    const original = input.items[item.itemIndex];
    assert.ok(Number.isInteger(item.instanceIndex) && item.instanceIndex >= 0 && item.instanceIndex < (original.quantity ?? 1), 'unknown instance');
    assert.equal(item.id, original.id === undefined ? item.itemIndex : original.id);
    const identity = `${item.itemIndex}:${item.instanceIndex}`;
    assert.ok(!seen.has(identity), 'duplicate instance'); seen.add(identity);
    const rule = original.rotation ?? 'free';
    assert.equal(item.rotation, rule === 'free' ? undefined : rule);
    const size = [item.dimensions.width, item.dimensions.height, item.dimensions.depth];
    const { width:w, height:h, depth:d } = original;
    const orientations = rule === 'fixed' ? [[w,h,d]] : rule === 'upright' ? [[w,h,d],[d,h,w]] :
      [[w,h,d],[w,d,h],[h,w,d],[h,d,w],[d,w,h],[d,h,w]];
    if (!item.position) { assert.deepEqual(size, [w,h,d]); continue; }
    assert.ok(orientations.some(o => o.every((v,i) => v === size[i])), 'disallowed orientation');
    const position = [item.position.x, item.position.y, item.position.z];
    const limit = [container.width, container.height, container.depth];
    position.forEach((value,i) => assert.ok(Number.isFinite(value) && value >= 0 && value + size[i] <= limit[i], 'out of bounds'));
    packedVolume += size[0] * size[1] * size[2];
  }
  // Partition membership must agree with the presence of a position.
  assert.ok(result.placements.every(item => item.position), 'placement without position');
  assert.ok(result.unpacked.every(item => !item.position), 'unpacked item has a position');
  for (let i = 0; i < result.placements.length; i++) {
    const a = result.placements[i];
    for (let j = 0; j < i; j++) {
      const b = result.placements[j];
      assert.ok(['x','y','z'].some((axis,k) => {
        const dim = ['width','height','depth'][k];
        return a.position[axis] + a.dimensions[dim] <= b.position[axis] || b.position[axis] + b.dimensions[dim] <= a.position[axis];
      }), 'overlapping placements');
    }
  }
  assert.equal(result.packedVolume, packedVolume);
  assert.equal(result.utilization, packedVolume / result.containerVolume);
  return { packedVolume, packedCount: result.packedCount, utilization: result.utilization,
    volumeUpperBound: Math.min(result.containerVolume, totalVolume) };
}
module.exports = { validate };
