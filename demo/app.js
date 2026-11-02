/* Demo-only UI. Packing decisions come entirely from BinPacking.pack via main(). */
(function() {
  'use strict';
  var examples={
    mixed:{container:[12,10,8],items:[['Carton A',5,4,4,4],['Carton B',3,3,6,5],['Small box',2,2,2,10]]},
    exact:{container:[4,4,4],items:[['Cube',2,2,2,8]]},
    partial:{container:[4,4,4],items:[['Large cube',3,3,3,3],['Small cube',1,1,1,16]]},
    orientation:{container:[4,3,2],items:[['Upright carton',2,3,4,1,'upright']]},
    regression:{container:[3,3,3],items:[['Box 1',3,3,2,1],['Box 2',3,2,1,1],['Box 3',3,1,1,1]]}
  };
  var result=null, fresh=false, busy=false, rowId=0, viewAvailable=true;
  function byId(id) { return document.getElementById(id); }
  function text(id,value) { byId(id).textContent=value; }
  var jsonButton=byId('export-json'), pngButton=byId('export-png');
  var viewer=PackingView.create(byId('packing-view'),selectBox,function(message) {
    viewAvailable=!message; var warning=byId('viewer-warning'); warning.textContent=message; warning.hidden=!message;
    pngButton.disabled=!viewAvailable || !fresh;
  });
  function state(message,error) { text('status',message); byId('status').classList.toggle('error',!!error); }
  function stale() {
    fresh=false; jsonButton.disabled=true; pngButton.disabled=true;
    text('view-state',result?'Previous result · inputs changed':'Calculate to see your load');
    state('Inputs changed. Calculate to update the arrangement.');
  }
  function addRow(item) {
    rowId++;
    var row=document.createElement('div'); row.className='box-inputs'; row.setAttribute('role','group'); row.setAttribute('aria-label','Box type '+rowId);
    ['lbl','dim1','dim2','dim3','boxn'].forEach(function(name,i) {
      var input=document.createElement('input'); input.name=name; input.value=item[i]; input.required=true;
      input.setAttribute('aria-label',['Item ID','Width','Height','Depth','Quantity'][i]);
      if (i) { input.type='number'; input.min=i===4?'1':'0.000001'; input.step=i===4?'1':'any'; }
      row.appendChild(input);
    });
    var remove=document.createElement('button'); remove.type='button'; remove.className='remove-box'; remove.textContent='×'; remove.setAttribute('aria-label','Remove box type '+rowId);
    remove.addEventListener('click',function() { row.remove(); stale(); }); row.appendChild(remove);
    var rotationLabel=document.createElement('label'); rotationLabel.className='rotation-field'; rotationLabel.textContent='Rotation';
    var rotation=document.createElement('select'); rotation.name='rotation'; rotation.setAttribute('aria-label','Rotation for box type '+rowId);
    [['free','Free rotation'],['upright','Upright · keep height'],['fixed','Fixed · no rotation']].forEach(function(pair) { rotation.add(new Option(pair[1],pair[0])); });
    rotation.value=item[5] || 'free'; rotationLabel.appendChild(rotation); row.appendChild(rotationLabel);
    byId('box-input-screen').appendChild(row);
  }
  function loadExample() {
    var example=examples[byId('example').value];
    ['strxx','stryy','strzz'].forEach(function(id,i) { byId(id).value=example.container[i]; });
    byId('box-input-screen').replaceChildren(); example.items.forEach(addRow); stale(); calculate();
  }
  function selectBox(index) {
    var select=byId('placement-select'); select.value=index<0?'':String(index); viewer.select(index);
    var details=byId('inspection-details'); details.replaceChildren();
    if (!result || index<0 || !result.placements[index]) { details.textContent='Select a box to see its position and rotated dimensions.'; return; }
    var item=result.placements[index], title=document.createElement('p'); title.className='selection-id'; title.textContent=String(item.id); details.appendChild(title);
    var dl=document.createElement('dl');
    [['INSTANCE',(item.instanceIndex+1)+' (item '+(item.itemIndex+1)+')'],['ROTATION',item.rotation || 'free'],['POSITION · X / Y / Z',[item.position.x,item.position.y,item.position.z].join(' / ')],
      ['ROTATED · W / H / D',[item.dimensions.width,item.dimensions.height,item.dimensions.depth].join(' / ')],['VOLUME',String(item.dimensions.width*item.dimensions.height*item.dimensions.depth)]].forEach(function(pair) {
      var cell=document.createElement('div'), dt=document.createElement('dt'), dd=document.createElement('dd'); dt.textContent=pair[0]; dd.textContent=pair[1]; cell.append(dt,dd); dl.appendChild(cell);
    }); details.appendChild(dl);
  }
  function update(value) {
    result=value; fresh=true; viewer.setResult(result);
    text('packed-count',result.packedCount+' / '+result.totalCount); text('utilization',(result.utilization*100).toFixed(1)+'%'); text('unpacked-count',result.unpacked.length);
    text('view-state',result.container.width+' × '+result.container.height+' × '+result.container.depth+' · original container axes');
    var select=byId('placement-select'); select.replaceChildren(new Option('Select a packed box','')); select.disabled=!result.placements.length;
    result.placements.forEach(function(item,i) { select.add(new Option(String(item.id)+' · instance '+(item.instanceIndex+1)+' (item '+(item.itemIndex+1)+')',String(i))); });
    selectBox(-1);
    var groups=new Map();
    result.placements.concat(result.unpacked).forEach(function(item) {
      if (!groups.has(item.itemIndex)) groups.set(item.itemIndex,{id:item.id,packed:0,total:0,unpacked:0,dimensions:item.dimensions,rotation:item.rotation});
      var group=groups.get(item.itemIndex); group.total++; if (item.position) group.packed++; else { group.unpacked++; group.dimensions=item.dimensions; }
    });
    var legend=byId('legend'), remaining=byId('unpacked-list'); legend.replaceChildren(); remaining.replaceChildren();
    Array.from(groups.entries()).sort(function(a,b) { return a[0]-b[0]; }).forEach(function(entry) {
      var index=entry[0], group=entry[1], row=document.createElement('div'); row.className='legend-row';
      var swatch=document.createElement('span'); swatch.className='swatch'; swatch.style.background=PackingView.colorFor(index); swatch.setAttribute('aria-hidden','true');
      var name=document.createElement('span'); name.className='legend-name'; name.textContent=String(group.id)+(group.rotation?' · '+group.rotation:'');
      var count=document.createElement('span'); count.className='legend-count'; count.textContent=group.packed+' / '+group.total+' packed'; row.append(swatch,name,count); legend.appendChild(row);
      if (group.unpacked) { var note=document.createElement('div'); note.className='unpacked-row'; note.textContent=String(group.id)+' × '+group.unpacked+' · '+[group.dimensions.width,group.dimensions.height,group.dimensions.depth].join(' × '); remaining.appendChild(note); }
    });
    if (!groups.size) legend.textContent='No items requested.';
    if (!result.unpacked.length) remaining.textContent=result.totalCount?'All requested boxes are packed.':'No items requested.';
    jsonButton.disabled=false; pngButton.disabled=!viewAvailable;
    state(result.packedCount+' of '+result.totalCount+' boxes packed. '+result.unpacked.length+' unpacked. '+
      (result.packedCount?'Click a box to inspect it.':result.totalCount?'Change the container or load and calculate again.':'Add a box type to get started.'));
  }
  function calculate() {
    if (busy) return;
    busy=true; fresh=false; jsonButton.disabled=true; pngButton.disabled=true; byId('calculate').disabled=true;
    state('Calculating your arrangement…');
    // Let the busy state paint before invoking the synchronous solver.
    setTimeout(function() {
      try { main(); }
      finally { busy=false; byId('calculate').disabled=false; }
    },0);
  }
  function download(href,name) {
    var link=document.createElement('a'); link.href=href; link.download=name; document.body.appendChild(link); link.click(); link.remove();
  }
  window.addEventListener('packing:result',function(event) { update(event.detail); });
  window.addEventListener('packing:error',function(event) {
    result=null; fresh=false; viewer.setResult(null); selectBox(-1); byId('placement-select').replaceChildren(new Option('No packed boxes','')); byId('placement-select').disabled=true;
    ['packed-count','utilization','unpacked-count'].forEach(function(id) { text(id,'—'); });
    text('view-state','Check your input'); text('legend',''); text('unpacked-list','No current result.'); jsonButton.disabled=true; pngButton.disabled=true; state(event.detail,true);
  });
  byId('packing-form').addEventListener('submit',function(event) { event.preventDefault(); calculate(); });
  byId('packing-form').addEventListener('input',stale);
  byId('example').addEventListener('change',loadExample);
  byId('add-box').addEventListener('click',function() { addRow(['Box '+(rowId+1),1,1,1,1]); stale(); byId('box-input-screen').lastElementChild.querySelector('input').focus(); });
  byId('placement-select').addEventListener('change',function() { selectBox(this.value===''?-1:Number(this.value)); });
  byId('zoom-in').addEventListener('click',function() { viewer.zoom(1.2); });
  byId('zoom-out').addEventListener('click',function() { viewer.zoom(1/1.2); });
  byId('reset-view').addEventListener('click',function() { viewer.reset(); });
  jsonButton.addEventListener('click',function() {
    if (!fresh) return;
    var url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
    download(url,'packing-result.json'); setTimeout(function() { URL.revokeObjectURL(url); },1000);
  });
  pngButton.addEventListener('click',function() {
    if (!fresh) return;
    viewer.snapshot(function(blob) {
      if (!blob) return state('Unable to export this view. Try resetting the 3D view.',true);
      var url=URL.createObjectURL(blob); download(url,'packing-view.png');
      setTimeout(function() { URL.revokeObjectURL(url); },1000);
    });
  });
  loadExample();
})();
