const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '../pack.js'), 'utf8');
const adapter = readFileSync(path.join(__dirname, '../pack1.js'), 'utf8');
// Only this test copy exposes closure state to retain focused skyline regressions.
const inspectableSource = source.replace('initialize();\nexeciterations();',
  'globalThis.__inspect = function(code) { return eval(code); };\ninitialize();\nexeciterations();');
assert.notEqual(inspectableSource, source);

const baseline = require('./fixtures/merged-solver-baseline.json');
const { createHash } = require('node:crypto');
function digest(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function comparable(result, types) {
  const all = new Map([...result.placements, ...result.unpacked].map(item =>
    [item.itemIndex + ':' + item.instanceIndex, item]));
  const boxes = types.flatMap((type, itemIndex) => Array.from({ length: type[3] }, (_, instanceIndex) => {
    const item = all.get(itemIndex + ':' + instanceIndex);
    const d = item.dimensions;
    return [item.position ? 1 : 0,
      item.position ? [item.position.x, item.position.y, item.position.z] : null,
      [d.width, d.height, d.depth]];
  }));
  return [result.packedCount, result.packedVolume, result.diagnostics.iterations, boxes];
}

function session() {
  const screen = { innerHTML: '', value: '' };
  const fields = {};
  let rows = [];
  const context = vm.createContext({
    console: { log() {} },
    document: {
      getElementById: id => id === 'screen' ? screen : fields[id],
      getElementsByClassName: () => rows
    }
  });
  vm.runInContext(inspectableSource, context);
  vm.runInContext(`
    var solve = BinPacking.pack;
    BinPacking.pack = function(input) {
      var result = solve(input);
      globalThis.__lastResult = result;
      return result;
    };
  `, context);
  vm.runInContext(adapter, context);
  return {
    context, screen,
    inspect(code) { return context.__inspect(code); },
    run(container, types) {
      ['strxx', 'stryy', 'strzz'].forEach((key, i) => fields[key] = { value: String(container[i]) });
      rows = types.map((type, index) => ({ children: { lbl: { value: 'box-' + index }, ...Object.fromEntries(
        ['dim1', 'dim2', 'dim3', 'boxn'].map((key, i) => [key, { value: String(type[i]) }])
      ) } }));
      const status = vm.runInContext('main()', context, { timeout: 10000 });
      return { status, result: context.__lastResult, context, screen };
    }
  };
}

// Independent geometry checks: do not use the solver's fit or volume routines.
function validate(result, container, types) {
  assert.equal(result.status, 0);
  const c = result.result;
  const expected = types.flatMap((t, itemIndex) => Array.from({ length: t[3] }, (_, instanceIndex) => ({
    dimensions: t.slice(0, 3), itemIndex, instanceIndex
  })));
  assert.equal(c.totalCount, expected.length);
  assert.equal(c.placements.length + c.unpacked.length, expected.length);
  const placements = [];
  const seen = new Set();
  let volume = 0;
  for (const item of [...c.placements, ...c.unpacked]) {
    assert.equal(item.id, 'box-' + item.itemIndex, 'browser label was not preserved');
    const key = item.itemIndex + ':' + item.instanceIndex;
    assert.ok(!seen.has(key), 'duplicate item instance ' + key);
    seen.add(key);
    const original = expected.find(e => e.itemIndex === item.itemIndex && e.instanceIndex === item.instanceIndex);
    assert.ok(original, 'unknown item instance ' + key);
    const d = [item.dimensions.width, item.dimensions.height, item.dimensions.depth];
    assert.deepEqual([...d].sort((a, b) => a - b), [...original.dimensions].sort((a, b) => a - b));
    if (!item.position) continue;
    const p = [item.position.x, item.position.y, item.position.z];
    p.forEach((v, axis) => {
      assert.ok(Number.isFinite(v) && v >= -1e-9, 'negative/nonfinite position for ' + key);
      assert.ok(d[axis] > 0 && v + d[axis] <= container[axis] + 1e-9,
        'item exceeds axis ' + axis + ': ' + JSON.stringify({ p, d, container }));
    });
    for (const other of placements) {
      assert.ok(p.some((v, axis) => v + d[axis] <= other.p[axis] + 1e-9 ||
        other.p[axis] + other.d[axis] <= v + 1e-9), 'overlapping items ' + other.i + ' and ' + key);
    }
    placements.push({ i: key, p, d });
    volume += d[0] * d[1] * d[2];
  }
  assert.equal(placements.length, c.packedCount);
  assert.ok(Math.abs(volume - c.packedVolume) < 1e-7);
  assert.equal(c.utilization, c.packedVolume / c.containerVolume);
  assert.ok(result.screen.value.includes('PACKED NUMBER OF BOXES'));
  assert.ok(!/undefined|NaN|Infinity/.test(result.screen.value));
  return placements;
}

const fixtures = [
  ['default example', [1, 3, 3], [[1, 2, 3, 1]], 1],
  ['issue #3 overlap', [3, 3, 3], [[3, 3, 2, 1], [3, 2, 1, 1], [3, 1, 1, 1]], 3],
  ['issue #3 column', [2, 8, 2], [[2, 2, 2, 4]], 4],
  ['three separate unit cubes', [3, 1, 1], [[1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1]], 3],
  ['issue #3 seven-box example', [3, 3, 4], [[3,3,2,1],[3,2,1,1],[3,1,1,1],[2,1,1,1],[1,2,1,1],[2,2,1,1],[1,1,1,1]]],
  ['issue #4 paper example', [84, 104, 96], [[40,52,36,3],[70,104,24,4],[14,104,48,2]]],
  ['issue #6', [306, 102, 112], [[225, 5, 20, 130]]],
  ['exhausted quantity group', [3, 1, 1], [[1,1,1,2],[9,9,9,1]], 2],
  ['empty input', [1,1,1], [], 0],
  ['no fit', [1,1,1], [[2,2,2,1]], 0],
  ['dimensions above old fit sentinel', [100000,100000,100000], [[1,1,1,1]], 1],
  ['decimal exact fit', [2.5,1.5,0.5], [[0.5,1.5,2.5,1]], 1]
];
for (const [name, container, types, count] of fixtures) {
  test(name, () => {
    const result = session().run(container, types);
    const placements = validate(result, container, types);
    assert.equal(digest(comparable(result.result, types)), baseline.fixtures[name],
      'packing decisions differ from merged correctness release');
    if (count !== undefined) assert.equal(placements.length, count);
  });
}

test('repeated calculations preserve the winner', () => {
  const s = session();
  for (const index of [1, 9, 0, 8, 5, 2]) {
    const [, container, types] = fixtures[index];
    const result = s.run(container, types);
    const first = validate(result, container, types);
    assert.deepEqual(validate(s.run(container, types), container, types), first);
  }
});

test('fresh layers after changing orientation', () => {
  const s = session();
  s.run([2,8,2], [[2,2,2,4]]);
  s.inspect('px=1;py=1;pz=1;listcanditlayers()');
  assert.equal(s.inspect('layerlistlen'), 0);
  assert.equal(s.inspect('layers.length'), 1);
});

test('item selection never crosses an exhausted group', () => {
  const s = session();
  s.run([4,4,4], [[1,1,1,2],[2,2,2,1]]);
  // Simulate a fresh trial: resetting packing flags also resets its cursor cache.
  s.inspect('nextUnpacked=[];boxlist[1].packst=1;boxlist[2].packst=1;boxlist[3].packst=0;findbox(4,4,4,4,4)');
  assert.equal(s.inspect('boxi'), 3);
  s.inspect('boxlist[3].packst=1;findbox(4,4,4,4,4)');
  assert.equal(s.inspect('boxi'), 0);
});

test('invalid input returns a readable error', () => {
  for (const [container, types] of [
    [[0,1,1], [[1,1,1,1]]], [[Infinity,1,1], []],
    [[1,1,1], [[-1,1,1,1]]], [[1,1,1], [[1,1,1,0]]],
    [[1,1,1], [[1,1,1,1.5]]], [[1,1,1], [[1,NaN,1,1]]],
    [[1e200,1e200,1], []], [[1,1,1], [[1e-200,1e-200,1,1]]]
  ]) {
    const result = session().run(container, types);
    assert.equal(result.status, 1);
    assert.match(result.screen.value, /positive/);
  }
});

test('seeded mixed-box cases satisfy packing invariants', () => {
  let seed = 0x3db1;
  const random = max => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % max + 1;
  };
  const s = session();
  const decisions = [];
  for (let i = 0; i < 250; i++) {
    const container = [random(12), random(12), random(12)];
    const types = Array.from({ length: random(6) }, () => [random(8), random(8), random(8), random(4)]);
    try {
      const result = s.run(container, types);
      validate(result, container, types);
      decisions.push(comparable(result.result, types));
    }
    catch (error) { error.message += `; case ${i}: ${JSON.stringify({ container, types })}`; throw error; }
  }
  assert.equal(digest(decisions), baseline.seeded, 'seeded packing decisions changed');
});

// Exercise both equal-sided gap branches with an edge that moves on placement.
for (const [name, width, left, expectedX] of [
  ['right edge', 10, 1, 3], ['left edge', 6, 2, 2]
]) {
  test('equal-sided gap uses the original ' + name, () => {
    const s = session();
    s.run([10,10,10], [[1,1,1,1]]);
    s.inspect(`
      quit=0; layerthickness=1; packedy=0; remainpz=10; px=${width};
      var gap = {cumx:4,cumz:1,pre:{cumx:${left},cumz:2},pos:{cumx:${width},cumz:2}};
      gap.pre.pos=gap; gap.pos.pre=gap;
      findsmallestz=function(){smallestz=gap;};
      findbox=function(){cboxi=1;cboxx=1;cboxy=1;cboxz=1;};
      checkfound=function(){layerdone=0;evened=0;};
      volumecheck=function(){quit=1;};
      packlayer();
    `);
    assert.equal(s.inspect('boxlist[1].cox'), expectedX);
  });
}

test('a valid calculation replaces a previous input error in the textarea', () => {
  const s = session();
  assert.equal(s.run([0,1,1], []).status, 1);
  validate(s.run([1,1,1], [[1,1,1,1]]), [1,1,1], [[1,1,1,1]]);
});
