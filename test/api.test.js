const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pack } = require('3dbinpackingjs');

function input() {
  return {
    container: { width: 2, height: 1, depth: 1 },
    items: [{ id: 'sku-A', width: 1, height: 1, depth: 1, quantity: 3 }]
  };
}

function freeze(value) {
  Object.values(value).forEach(child => {
    if (child && typeof child === 'object') freeze(child);
  });
  return Object.freeze(value);
}

test('package exposes the same API through CommonJS and ES modules', async () => {
  const esm = await import('3dbinpackingjs');
  assert.equal(esm.pack, pack);
  assert.deepEqual(Object.keys(require('3dbinpackingjs')), ['pack']);
});

test('public results preserve identities for packed and unpacked instances', () => {
  const result = pack(input());
  assert.equal(result.totalCount, 3);
  assert.equal(result.packedCount, 2);
  assert.equal(result.packedVolume, 2);
  assert.equal(result.totalItemVolume, 3);
  assert.equal(result.containerVolume, 2);
  assert.equal(result.utilization, 1);
  assert.deepEqual(result.placements.map(p => [p.id, p.itemIndex, p.instanceIndex]),
    [['sku-A', 0, 0], ['sku-A', 0, 1]]);
  assert.deepEqual(result.unpacked, [{
    id: 'sku-A', itemIndex: 0, instanceIndex: 2,
    dimensions: { width: 1, height: 1, depth: 1 }
  }]);
  assert.deepEqual(result.placements.map(p => p.position), [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]);
  assert.ok(Number.isInteger(result.diagnostics.iterations));
});

test('optional quantity and ID have stable defaults; duplicate IDs remain distinct', () => {
  const request = {
    container: { width: 4, height: 1, depth: 1 },
    items: [undefined, 0, '', 'same', 'same'].map(id => ({ id, width: 1, height: 1, depth: 1 }))
  };
  const result = pack(request);
  const all = [...result.placements, ...result.unpacked].sort((a, b) => a.itemIndex - b.itemIndex);
  assert.deepEqual(all.map(i => i.id), [0, 0, '', 'same', 'same']);
  assert.deepEqual(all.map(i => [i.itemIndex, i.instanceIndex]), [[0,0],[1,0],[2,0],[3,0],[4,0]]);
});

test('frozen inputs are accepted and results own their data', () => {
  const request = freeze(input());
  const before = JSON.stringify(request);
  const first = pack(request);
  const second = pack(request);
  first.container.width = 999;
  first.placements[0].position.x = 999;
  first.placements[0].dimensions.width = 999;
  first.unpacked[0].dimensions.width = 999;
  first.placements.length = 0;
  assert.equal(JSON.stringify(request), before);
  assert.deepEqual(pack(request), second);
});

test('interleaved calls and a nested call during input access have independent state', () => {
  const request = input();
  const expected = pack(request);
  const other = { container: { width: 1, height: 2, depth: 3 }, items: [] };
  pack(other);
  assert.throws(() => pack({}), TypeError);
  assert.deepEqual(pack(request), expected);
  Object.defineProperty(request.items[0], 'width', { get() { pack(other); return 1; } });
  assert.deepEqual(pack(request), expected);
});

test('malformed API inputs throw TypeError rather than coercing values', () => {
  const invalid = [
    undefined, null, [], {}, { container: input().container },
    { ...input(), items: null }, { ...input(), items: {} },
    { ...input(), items: [null] }, { ...input(), items: new Array(1) },
    { ...input(), container: { width: '2', height: 1, depth: 1 } },
    { ...input(), container: { width: true, height: 1, depth: 1 } },
    { ...input(), container: { width: NaN, height: 1, depth: 1 } },
    { ...input(), container: { width: 0, height: 1, depth: 1 } },
    { ...input(), items: [{ ...input().items[0], quantity: '3' }] },
    { ...input(), items: [{ ...input().items[0], quantity: 1.5 }] },
    { ...input(), items: [{ ...input().items[0], quantity: 0 }] },
    { ...input(), items: [{ ...input().items[0], quantity: Number.MAX_SAFE_INTEGER + 1 }] },
    ...[null, {}, Infinity, false].map(id => ({ ...input(), items: [{ ...input().items[0], id }] }))
  ];
  for (const value of invalid) assert.throws(() => pack(value), TypeError);
  assert.deepEqual(pack({ container: input().container, items: [] }).placements, []);
});

test('standalone core needs no DOM or console and exposes only its browser namespace', () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(path.join(__dirname, '../pack.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context), ['BinPacking']);
  const result = context.BinPacking.pack(input());
  assert.equal(result.packedCount, 2);
  assert.deepEqual(Object.keys(context), ['BinPacking']);
});

test('the HTML example loads the core before its form adapter', () => {
  const html = readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(scripts, ['pack.js', 'pack1.js', 'demo/viewer.js', 'demo/support.js', 'demo/runner.js', 'demo/app.js']);
});
