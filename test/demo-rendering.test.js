const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const path=require('node:path');

function setup() {
  class Element {
    constructor() { this.children=[];this.listeners={};this.style={};this.classList={toggle(){}};this.value='';this.hidden=false; }
    addEventListener(name,fn) { (this.listeners[name]??=[]).push(fn); }
    removeEventListener(name,fn) { this.listeners[name]=(this.listeners[name]||[]).filter(x=>x!==fn); }
    fire(name,event={}) { for(const fn of this.listeners[name]||[])fn.call(this,event); }
    setAttribute() {}
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.append(node); }
    add(node) { this.append(node); }
    replaceChildren(...nodes) { this.children=nodes; }
    reportValidity() { return true; }
    click() { this.fire('click'); }
    remove() {}
  }
  const elements=new Map(), get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  const details=new Element(); details.open=false;get('screen').closest=()=>details;
  get('example').value='exact';
  let callbacks, picked, selected, exported;
  const viewer={setResult(){},select(i){selected=i;},reset(){},zoom(){}};
  const context=vm.createContext({
    document:{getElementById:get,createElement:()=>new Element(),body:new Element(),getElementsByClassName:()=>[]},
    Option:function(label,value){this.textContent=label;this.value=value;},
    PackingView:{create(canvas,onPick){picked=onPick;return viewer;},colorFor:()=> '#123'},
    PackingSupport:{analyze(){throw Error('worker analysis should be reused');}},
    PackingRunner:{create(options){callbacks=options;return {cancel(){return true;},run(){}};}},
    location:{protocol:'https:'}, Blob,
    URL:{createObjectURL(blob){exported=blob;return 'blob:test';},revokeObjectURL(){}},setTimeout(){},
    CustomEvent:function(type,options){this.type=type;this.detail=options.detail;}
  });
  context.window=context;
  const events=new Element();context.addEventListener=events.addEventListener.bind(events);
  context.dispatchEvent=event=>events.fire(event.type,event);
  for(const file of ['pack1.js','demo/app.js'])vm.runInContext(readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return {get,details,context,receive:result=>callbacks.onResult({result,contact:{noContact:0,partialContact:0,records:result.placements.map(()=>({fraction:1}))}}),
    pick:i=>picked(i),selected:()=>selected,exported:()=>exported};
}
function result(count) {
  return {container:{width:count,height:1,depth:1},packedCount:count,totalCount:count+2,utilization:1,containerVolume:count,packedVolume:count,totalItemVolume:count+2,diagnostics:{iterations:1},
    placements:Array.from({length:count},(_,i)=>({id:'same',itemIndex:0,instanceIndex:i,position:{x:i,y:0,z:0},dimensions:{width:1,height:1,depth:1}})),
    unpacked:[0,1].map(i=>({id:'other',itemIndex:1,instanceIndex:i,dimensions:{width:2,height:2,depth:2}}))};
}

test('large results bound selector size, preserve all indices and export the full result',async()=>{
  const ui=setup(), value=result(10001); ui.receive(value);
  assert.equal(ui.get('placement-select').children.length,101);
  assert.equal(ui.get('placement-pages').hidden,false);
  assert.equal(ui.get('placement-previous').disabled,true);
  ui.get('placement-next').click();
  assert.equal(ui.get('placement-select').children[1].value,'100');
  ui.get('placement-page').value='101';ui.get('placement-page').fire('input');
  assert.equal(ui.get('placement-select').children.length,2);
  assert.equal(ui.get('placement-next').disabled,true);
  ui.get('placement-select').value='10000';ui.get('placement-select').fire('change');
  assert.equal(ui.selected(),10000);
  ui.pick(350);
  assert.equal(ui.get('placement-page').value,4);
  assert.equal(ui.get('placement-select').value,'350');
  assert.equal(ui.selected(),350);
  ui.get('placement-page').value='9999';ui.get('placement-page').fire('change');
  assert.equal(ui.get('placement-page').value,101);
  ui.get('placement-page').value='1.5';ui.get('placement-page').fire('change');
  assert.equal(ui.get('placement-page').value,101);
  assert.equal(ui.get('legend').children.length,2);
  ui.get('export-json').click();
  assert.deepEqual(JSON.parse(await ui.exported().text()),value);
  ui.receive(result(2));
  assert.equal(ui.get('placement-select').children.length,3);
  assert.equal(ui.get('placement-pages').hidden,true);
  assert.equal(ui.get('placement-page').value,1);
  ui.receive(result(0));
  assert.equal(ui.get('placement-select').disabled,true);
  assert.equal(ui.get('placement-select').children.length,1);
});

test('collapsed reports defer formatting, keep only the latest result and clear pending work on errors',()=>{
  const ui=setup();let formats=0;
  const first=result(3), latest=result(5);
  Object.defineProperty(first.diagnostics,'iterations',{get(){formats++;return 1;}});
  Object.defineProperty(latest.diagnostics,'iterations',{get(){formats++;return 2;}});
  ui.receive(first);ui.receive(latest);
  assert.equal(formats,0);assert.equal(ui.get('screen').value,'');
  ui.details.open=true;ui.details.fire('toggle');
  assert.equal(formats,1);assert.match(ui.get('screen').value,/TOTAL NUMBER OF BOXES : 7/);
  ui.details.open=false;ui.details.fire('toggle');ui.details.open=true;ui.details.fire('toggle');
  assert.equal(formats,1);
  ui.receive(first);assert.equal(formats,2);
  ui.details.open=false;ui.receive(latest);ui.context.PackingForm.showError('Invalid input');
  ui.details.open=true;ui.details.fire('toggle');
  assert.equal(formats,2);assert.equal(ui.get('screen').value,'Invalid input');
  assert.equal(ui.get('placement-select').disabled,true);
  assert.equal(ui.get('placement-pages').hidden,true);
  // Custom pages without a disclosure retain immediate text reports.
  ui.get('screen').closest=()=>null;ui.context.dispatchEvent=()=>{};ui.context.PackingForm.showResult(first);
  assert.equal(formats,3);assert.match(ui.get('screen').value,/TOTAL NUMBER OF BOXES : 5/);
});
