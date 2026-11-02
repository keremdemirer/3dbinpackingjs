const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)[1];
function meta(name) {
  return html.match(new RegExp('<meta (?:property|name)="'+name+'" content="([^"]+)"'))?.[1];
}
test('canonical, sharing metadata, sitemap and structured data agree on public identity',()=>{
  assert.equal(canonical,require('../package.json').homepage);
  assert.equal(meta('og:url'),canonical);
  const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]),[canonical]);
  const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const page=graph.find(n=>n['@type']==='WebPage');assert.equal(page.url,canonical);
  const entities=new Set(graph.map(n=>n['@id']));
  assert.ok(entities.has(page.mainEntity['@id']));assert.ok(entities.has(page.about['@id']));
  assert.equal(graph.find(n=>n['@type']==='SoftwareSourceCode').codeRepository,'https://github.com/keremdemirer/3dbinpackingjs');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
});
test('social preview resolves under the project path and matches declared PNG dimensions',()=>{
  const image=meta('og:image');assert.equal(meta('twitter:image'),image);
  assert.ok(image.startsWith(canonical));
  const relative=image.slice(canonical.length);
  const png=fs.readFileSync(path.join(root,relative));
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16),Number(meta('og:image:width')));
  assert.equal(png.readUInt32BE(20),Number(meta('og:image:height')));
  assert.ok(meta('og:image:alt'));assert.ok(meta('description'));
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href=match[1];
    if(href.startsWith('#')) {assert.ok(html.includes('id="'+href.slice(1)+'"'));continue;}
    if(/^(https?:|\.\/)/.test(href))continue;
    assert.ok(fs.existsSync(path.join(root,href)),href+' exists');
    assert.ok(new URL(href,canonical).href.startsWith(canonical),'asset stays under the GitHub Pages project path');
  }
});
test('algorithm and API explanations remain available without running demo scripts',()=>{
  const staticContent=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  for(const id of ['how-it-works','javascript-api','questions']) assert.ok(staticContent.includes('id="'+id+'"'));
  assert.match(staticContent,/EB-AFIT/);assert.match(staticContent,/rotation: 'upright'/);
  assert.match(staticContent,/does not guarantee the optimal packing/);
  assert.match(staticContent,/Upstream licensing remains unresolved/);
});
