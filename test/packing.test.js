const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../pack1.js'), 'utf8');

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
  vm.runInContext(source, context);
  return {
    context, screen,
    run(container, types) {
      ['strxx', 'stryy', 'strzz'].forEach((key, i) => fields[key] = { value: String(container[i]) });
      rows = types.map(type => ({ children: Object.fromEntries(
        ['dim1', 'dim2', 'dim3', 'boxn'].map((key, i) => [key, { value: String(type[i]) }])
      ) }));
      const status = vm.runInContext('main()', context, { timeout: 10000 });
      return { status, context, screen };
    }
  };
}

// Independent geometry checks: do not use the solver's fit or volume routines.
function validate(result, container, types) {
  assert.equal(result.status, 0);
  const c = result.context;
  const expected = types.flatMap(t => Array.from({ length: t[3] }, () => t.slice(0, 3)));
  assert.equal(c.tbn, expected.length);
  const placements = [];
  let volume = 0;
  for (let i = 1; i <= c.tbn; i++) {
    const b = c.boxlist[i];
    if (!b.packst) continue;
    const p = [b.cox, b.coy, b.coz];
    const d = [b.packx, b.packy, b.packz];
    assert.deepEqual([...d].sort((a, b) => a - b), [...expected[i - 1]].sort((a, b) => a - b));
    p.forEach((v, axis) => {
      assert.ok(Number.isFinite(v) && v >= -1e-9, `negative/nonfinite position for item ${i}`);
      assert.ok(d[axis] > 0 && v + d[axis] <= container[axis] + 1e-9,
        `item ${i} exceeds axis ${axis}: ${JSON.stringify({ p, d, container })}`);
    });
    for (const other of placements) {
      assert.ok(p.some((v, axis) => v + d[axis] <= other.p[axis] + 1e-9 ||
        other.p[axis] + other.d[axis] <= v + 1e-9), `overlapping items ${other.i} and ${i}`);
    }
    placements.push({ i, p, d });
    volume += d[0] * d[1] * d[2];
  }
  assert.equal(placements.length, c.bestpackednum);
  assert.equal(placements.length, c.packednumbox);
  assert.ok(Math.abs(volume - c.bestvolume) < 1e-7);
  assert.equal(c.packedvolume, c.bestvolume);
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
    const placements = validate(session().run(container, types), container, types);
    if (count !== undefined) assert.equal(placements.length, count);
  });
}

test('repeated calculations and repeated reports preserve the winner', () => {
  const s = session();
  for (const index of [1, 9, 0, 8, 5, 2]) {
    const [, container, types] = fixtures[index];
    const result = s.run(container, types);
    const first = validate(result, container, types);
    vm.runInContext('report()', s.context, { timeout: 10000 });
    assert.deepEqual(validate(result, container, types), first);
  }
});

test('fresh layers after changing orientation', () => {
  const s = session();
  s.run([2,8,2], [[2,2,2,4]]);
  vm.runInContext('px=1;py=1;pz=1;listcanditlayers()', s.context);
  assert.equal(s.context.layerlistlen, 0);
  assert.equal(s.context.layers.length, 1);
});

test('item selection never crosses an exhausted group', () => {
  const s = session();
  s.run([4,4,4], [[1,1,1,2],[2,2,2,1]]);
  vm.runInContext('boxlist[1].packst=1;boxlist[2].packst=1;boxlist[3].packst=0;findbox(4,4,4,4,4)', s.context);
  assert.equal(s.context.boxi, 3);
  vm.runInContext('boxlist[3].packst=1;findbox(4,4,4,4,4)', s.context);
  assert.equal(s.context.boxi, 0);
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
  for (let i = 0; i < 250; i++) {
    const container = [random(12), random(12), random(12)];
    const types = Array.from({ length: random(6) }, () => [random(8), random(8), random(8), random(4)]);
    try { validate(s.run(container, types), container, types); }
    catch (error) { error.message += `; case ${i}: ${JSON.stringify({ container, types })}`; throw error; }
  }
});

// Exercise both equal-sided gap branches with an edge that moves on placement.
for (const [name, width, left, expectedX] of [
  ['right edge', 10, 1, 3], ['left edge', 6, 2, 2]
]) {
  test('equal-sided gap uses the original ' + name, () => {
    const s = session();
    s.run([10,10,10], [[1,1,1,1]]);
    vm.runInContext(`
      quit=0; layerthickness=1; packedy=0; remainpz=10; px=${width};
      var gap = {cumx:4,cumz:1,pre:{cumx:${left},cumz:2},pos:{cumx:${width},cumz:2}};
      gap.pre.pos=gap; gap.pos.pre=gap;
      findsmallestz=function(){smallestz=gap;};
      findbox=function(){cboxi=1;cboxx=1;cboxy=1;cboxz=1;};
      checkfound=function(){layerdone=0;evened=0;};
      volumecheck=function(){quit=1;};
      packlayer();
    `, s.context);
    assert.equal(s.context.boxlist[1].cox, expectedX);
  });
}

test('a valid calculation replaces a previous input error in the textarea', () => {
  const s = session();
  assert.equal(s.run([0,1,1], []).status, 1);
  validate(s.run([1,1,1], [[1,1,1,1]]), [1,1,1], [[1,1,1,1]]);
});
