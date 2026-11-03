const assert = require('node:assert/strict');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_PATH: '', npm_config_update_notifier: 'false' }
  });
}
function npm(args, cwd) {
  // npm test supplies the JS CLI path, avoiding shell quoting and .cmd launchers.
  return process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args], cwd)
    : run('npm', args, cwd);
}

test('packed archive installs and works as an isolated JS and TypeScript dependency', () => {
  const temp = mkdtempSync(path.join(tmpdir(), '3dbinpackingjs-package-'));
  try {
    const cache = path.join(temp, 'cache');
    const packed = JSON.parse(npm([
      'pack', '--json', '--ignore-scripts', '--offline', '--pack-destination', temp, '--cache', cache
    ], root))[0];
    assert.deepEqual(packed.files.map(file => file.path).sort(), [
      'CHANGELOG.md', 'LICENSE-STATUS.md', 'README.md', 'index.html',
      'demo/app.js', 'demo/runner.js', 'demo/packing-worker.js', 'demo/style.css', 'demo/viewer.js', 'demo/support.js',
      'docs/API.md', 'docs/DEMO.md', 'docs/README.md', 'docs/SEO.md', 'docs/TESTING.md', 'docs/assets/banner.svg',
      'demo/assets/favicon.svg', 'demo/assets/social-preview.svg', 'demo/assets/social-preview.png', 'sitemap.xml',
      'pack.d.mts', 'pack.d.ts', 'pack.js', 'pack.mjs', 'pack1.js', 'package.json'
    ].sort());

    const consumer = path.join(temp, 'consumer');
    mkdirSync(consumer);
    writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'packing-consumer', private: true }));
    npm(['install', path.join(temp, packed.filename), '--ignore-scripts', '--offline',
      '--no-audit', '--no-fund', '--package-lock=false', '--cache', cache], consumer);

    const request = JSON.stringify({
      container: { width: 2, height: 1, depth: 1 },
      items: [{ id: 'archive-item', width: 1, height: 1, depth: 1, quantity: 3 }]
    });
    const checks = `
      const result = pack(${request});
      assert.equal(result.packedCount, 2);
      assert.equal(result.utilization, 1);
      assert.equal(result.unpacked[0].id, 'archive-item');
      assert.deepEqual(result.placements[1].position, { x: 1, y: 0, z: 0 });
      const constrained = pack({ container: {width:4,height:3,depth:2}, items: [{width:2,height:3,depth:4,rotation:'upright'}] });
      assert.equal(constrained.packedCount, 1);
      assert.equal(constrained.placements[0].rotation, 'upright');
      assert.equal(pack({container:{width:1,height:1,depth:1},items:[],search:'extended'}).diagnostics.search.passes,1);
      assert.deepEqual(pack({container:{width:1,height:1,depth:1},items:[],settle:true}).diagnostics.settling,{movedCount:0,totalDrop:0});
    `;
    run(process.execPath, ['--eval', `
      const assert = require('node:assert/strict');
      const path = require('node:path');
      assert.equal(require.resolve('3dbinpackingjs'), path.join(process.cwd(), 'node_modules/3dbinpackingjs/pack.js'));
      const { pack } = require('3dbinpackingjs');
      ${checks}
    `], consumer);
    run(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      import { pack } from '3dbinpackingjs';
      ${checks}
    `], consumer);

    // The fixtures resolve declarations from the installed archive, not self-references.
    for (const file of ['commonjs.cts', 'esm.mts', 'tsconfig.json']) {
      cpSync(path.join(root, 'type-tests', file), path.join(consumer, file));
    }
    const browser = readFileSync(path.join(root, 'type-tests/browser.ts'), 'utf8')
      .replace('../pack.d.ts', './node_modules/3dbinpackingjs/pack.d.ts');
    writeFileSync(path.join(consumer, 'browser.ts'), browser);
    run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json'], consumer);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
