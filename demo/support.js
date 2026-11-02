/* Direct base-contact diagnostics, not a weight, balance, or stability model. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PackingSupport=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function unionArea(rectangles) {
    var xs=Array.from(new Set(rectangles.flatMap(function(r){return [r[0],r[2]];}))).sort(function(a,b){return a-b;});
    var area=0;
    for(var i=1;i<xs.length;i++) {
      var left=xs[i-1],right=xs[i];
      var intervals=rectangles.filter(function(r){return r[0]<right&&r[2]>left;}).map(function(r){return [r[1],r[3]];}).sort(function(a,b){return a[0]-b[0];});
      var end=-Infinity,length=0;
      intervals.forEach(function(interval){length+=Math.max(0,interval[1]-Math.max(interval[0],end));end=Math.max(end,interval[1]);});
      area+=(right-left)*length;
    }
    return area;
  }
  function analyze(result) {
    var records=result.placements.map(function(item,index){
      var p=item.position,d=item.dimensions,baseArea=d.width*d.depth;
      if(p.y===0)return {index:index,kind:'floor',fraction:1,contactArea:baseArea,baseArea:baseArea};
      var rectangles=[];
      result.placements.forEach(function(below,j){
        if(j===index||below.position.y+below.dimensions.height!==p.y)return;
        var x0=Math.max(p.x,below.position.x),x1=Math.min(p.x+d.width,below.position.x+below.dimensions.width);
        var z0=Math.max(p.z,below.position.z),z1=Math.min(p.z+d.depth,below.position.z+below.dimensions.depth);
        if(x1>x0&&z1>z0)rectangles.push([x0,z0,x1,z1]);
      });
      var contactArea=unionArea(rectangles),fraction=Math.min(1,contactArea/baseArea);
      return {index:index,kind:contactArea===0?'none':fraction===1?'full':'partial',fraction:fraction,contactArea:contactArea,baseArea:baseArea};
    });
    return {records:records,noContact:records.filter(function(r){return r.kind==='none';}).length,
      partialContact:records.filter(function(r){return r.kind==='partial';}).length,
      fullContact:records.filter(function(r){return r.kind==='floor'||r.kind==='full';}).length};
  }
  return {analyze:analyze,unionArea:unionArea};
});
