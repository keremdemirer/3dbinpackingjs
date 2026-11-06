/* Standalone WebGL viewer for the demo. All geometry uses the API's original axes. */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.PackingView = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';
  var palette = ['#279c87', '#e7a244', '#668bd1', '#ce738b', '#8d7cbb', '#6fa57b', '#c48455', '#70abbc'];
  var edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  var faces = [[0,1,2,3], [4,7,6,5], [0,4,5,1], [3,2,6,7], [0,3,7,4], [1,5,6,2]];
  var shades = [0.76,0.86,0.65,1,0.82,0.92];
  function colorFor(index) { return palette[index % palette.length]; }
  function rgb(hex) { return [1,3,5].map(function(i) { return parseInt(hex.slice(i,i+2),16)/255; }); }
  function basis(camera) {
    var s = Math.sin(camera.yaw), c = Math.cos(camera.yaw);
    var p = Math.sin(camera.pitch), q = Math.cos(camera.pitch);
    return { right: [c,0,-s], up: [-s*p,q,-c*p], toward: [s*q,p,c*q] };
  }
  function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function bounds(result, item) {
    var d = result.container;
    var scale = Math.max(d.width,d.height,d.depth);
    var center = [d.width/2,d.height/2,d.depth/2];
    var min = [item.position.x,item.position.y,item.position.z].map(function(v,i) { return (v-center[i])/scale; });
    var size = [item.dimensions.width,item.dimensions.height,item.dimensions.depth];
    return { min: min, max: min.map(function(v,i) { return v+size[i]/scale; }) };
  }
  function corners(b) {
    var a=b.min, z=b.max;
    return [[a[0],a[1],a[2]],[z[0],a[1],a[2]],[z[0],z[1],a[2]],[a[0],z[1],a[2]],
      [a[0],a[1],z[2]],[z[0],a[1],z[2]],[z[0],z[1],z[2]],[a[0],z[1],z[2]]];
  }
  function halfSize(camera,width,height) { return [width/height/camera.zoom, 1/camera.zoom]; }
  function project(point,camera,width,height) {
    var b=basis(camera), h=halfSize(camera,width,height);
    return [(1+(dot(point,b.right)+camera.panX)/h[0])*width/2,
      (1-(dot(point,b.up)+camera.panY)/h[1])*height/2];
  }
  // Ray/box slab intersection selects the closest visible instance, including after orbiting.
  function pick(result,camera,width,height,x,y) {
    if (!result || !width || !height) return -1;
    var b=basis(camera), h=halfSize(camera,width,height);
    var u=(2*x/width-1)*h[0]-camera.panX, v=(1-2*y/height)*h[1]-camera.panY;
    var origin=b.toward.map(function(n,i) { return n*3+b.right[i]*u+b.up[i]*v; });
    var direction=b.toward.map(function(n) { return -n; });
    var nearest=Infinity, found=-1;
    result.placements.forEach(function(item,index) {
      var box=bounds(result,item), near=0, far=Infinity;
      for (var axis=0; axis<3; axis++) {
        if (Math.abs(direction[axis])<1e-12) {
          if (origin[axis]<box.min[axis] || origin[axis]>box.max[axis]) return;
        } else {
          var t1=(box.min[axis]-origin[axis])/direction[axis];
          var t2=(box.max[axis]-origin[axis])/direction[axis];
          near=Math.max(near,Math.min(t1,t2)); far=Math.min(far,Math.max(t1,t2));
          if (near>far) return;
        }
      }
      if (near<nearest) { nearest=near; found=index; }
    });
    return found;
  }
  function create(canvas,onSelect,onStatus) {
    var result=null, selected=-1, gl, program, meshes, geometryDirty=true, selectionDirty=true;
    var camera={yaw:0.68,pitch:0.48,zoom:1.25,panX:0,panY:0};
    var pointers=new Map(), gesture=null, moved=false, travel=0;
    function init() {
      gl=canvas.getContext('webgl', { antialias:true, preserveDrawingBuffer:true });
      if (!gl) { onStatus('3D rendering is unavailable. Results, box inspection, and JSON export still work.'); return; }
      function shader(type,source) {
        var s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
        if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error('Unable to initialize the 3D viewer.');
        return s;
      }
      program=gl.createProgram();
      var vertex=shader(gl.VERTEX_SHADER,'attribute vec3 a_position; attribute vec3 a_color; uniform mat4 u_matrix; varying vec3 v_color; void main(){ gl_Position=u_matrix*vec4(a_position,1.0); v_color=a_color; }');
      var fragment=shader(gl.FRAGMENT_SHADER,'precision mediump float; varying vec3 v_color; void main(){ gl_FragColor=vec4(v_color,1.0); }');
      gl.attachShader(program,vertex); gl.attachShader(program,fragment); gl.linkProgram(program);
      gl.deleteShader(vertex); gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Unable to initialize the 3D viewer.');
      meshes={};
      ['solid','outlines','frame','selection'].forEach(function(name) { meshes[name]={buffer:gl.createBuffer(),count:0}; });
      geometryDirty=true; selectionDirty=true;
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      onStatus('');
    }
    function upload(name,vertices) {
      var mesh=meshes[name]; mesh.count=vertices.length/6;
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    }
    function draw(name,mode) {
      var mesh=meshes[name]; if (!mesh.count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
      var p=gl.getAttribLocation(program,'a_position'), c=gl.getAttribLocation(program,'a_color');
      gl.enableVertexAttribArray(p); gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);
      gl.enableVertexAttribArray(c); gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12);
      gl.drawArrays(mode,0,mesh.count);
    }
    function line(list,a,z,color) { list.push.apply(list,a.concat(color,z,color)); }
    function buildGeometry() {
      var solid=[], outlines=[], frame=[];
      result.placements.forEach(function(item) {
        var points=corners(bounds(result,item)), color=rgb(colorFor(item.itemIndex));
        faces.forEach(function(face,f) {
          [0,1,2,0,2,3].forEach(function(i) {
            solid.push.apply(solid,points[face[i]].concat(color.map(function(v) { return v*shades[f]; })));
          });
        });
        edges.forEach(function(e) { line(outlines,points[e[0]],points[e[1]],[0.16,0.27,0.25]); });
      });
      var box=corners(bounds(result,{position:{x:0,y:0,z:0},dimensions:result.container}));
      edges.forEach(function(e) { line(frame,box[e[0]],box[e[1]],[0.36,0.46,0.43]); });
      for (var i=0; i<=10; i++) {
        var x=box[0][0]+(box[1][0]-box[0][0])*i/10, z=box[0][2]+(box[4][2]-box[0][2])*i/10;
        line(frame,[x,box[0][1]-0.002,box[0][2]],[x,box[0][1]-0.002,box[4][2]],[0.83,0.87,0.85]);
        line(frame,[box[0][0],box[0][1]-0.002,z],[box[1][0],box[0][1]-0.002,z],[0.83,0.87,0.85]);
      }
      [[0,[0.82,0.32,0.29]],[1,[0.22,0.53,0.34]],[2,[0.29,0.45,0.78]]].forEach(function(pair) {
        var end=box[0].slice(); end[pair[0]]+=0.16; line(frame,box[0],end,pair[1]);
      });
      upload('solid',solid); upload('outlines',outlines); upload('frame',frame);
      geometryDirty=false;
    }
    function buildSelection() {
      var selection=[], item=result.placements[selected];
      if(item) {
        var points=corners(bounds(result,item));
        edges.forEach(function(e) { line(selection,points[e[0]],points[e[1]],[0.98,0.34,0.12]); });
      }
      upload('selection',selection); selectionDirty=false;
    }
    function render() {
      if (!gl || gl.isContextLost()) return;
      var rect=canvas.getBoundingClientRect(), ratio=Math.min(root.devicePixelRatio||1,2);
      var width=Math.max(1,Math.round(rect.width*ratio)), height=Math.max(1,Math.round(rect.height*ratio));
      if (canvas.width!==width || canvas.height!==height) { canvas.width=width; canvas.height=height; }
      gl.viewport(0,0,width,height); gl.clearColor(0.955,0.967,0.96,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      if (!result) {
        if(geometryDirty) {
          Object.keys(meshes).forEach(function(name) { upload(name,[]); });
          geometryDirty=false; selectionDirty=false;
        }
        return;
      }
      gl.useProgram(program);
      var b=basis(camera), h=halfSize(camera,width,height), r=b.right, u=b.up, n=b.toward;
      gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,new Float32Array([
        r[0]/h[0],u[0]/h[1],-n[0]/4,0, r[1]/h[0],u[1]/h[1],-n[1]/4,0,
        r[2]/h[0],u[2]/h[1],-n[2]/4,0, camera.panX/h[0],camera.panY/h[1],0,1
      ]));
      if(geometryDirty)buildGeometry();
      if(selectionDirty)buildSelection();
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1,1); draw('solid',gl.TRIANGLES); gl.disable(gl.POLYGON_OFFSET_FILL);
      draw('frame',gl.LINES); draw('outlines',gl.LINES);
      // A selected box stays identifiable even when another box occludes it.
      gl.disable(gl.DEPTH_TEST); draw('selection',gl.LINES); gl.enable(gl.DEPTH_TEST);
    }
    function clamp() { camera.pitch=Math.max(-1.45,Math.min(1.45,camera.pitch)); camera.zoom=Math.max(0.35,Math.min(8,camera.zoom)); }
    function zoom(factor) { camera.zoom*=factor; clamp(); render(); }
    function reset() { Object.assign(camera,{yaw:0.68,pitch:0.48,zoom:1.25,panX:0,panY:0}); render(); }
    function point(e) { return {x:e.clientX,y:e.clientY}; }
    function startGesture() {
      var values=Array.from(pointers.values());
      if (values.length===2) gesture={x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2,
        distance:Math.hypot(values[1].x-values[0].x,values[1].y-values[0].y)};
      else gesture=null;
    }
    canvas.addEventListener('pointerdown',function(e) {
      e.preventDefault(); canvas.focus(); canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId,point(e)); if (pointers.size===1) { moved=false; travel=0; } else moved=true;
      startGesture();
    });
    canvas.addEventListener('pointermove',function(e) {
      var old=pointers.get(e.pointerId); if (!old) return;
      var current=point(e), dx=current.x-old.x, dy=current.y-old.y;
      pointers.set(e.pointerId,current); travel+=Math.hypot(dx,dy); if (travel>4) moved=true;
      var rect=canvas.getBoundingClientRect(), unit=2/(Math.max(rect.height,1)*camera.zoom);
      if (pointers.size===2) {
        var previous=gesture; startGesture();
        if (previous) {
          camera.panX+=(gesture.x-previous.x)*unit; camera.panY-=(gesture.y-previous.y)*unit;
          if (previous.distance>0) camera.zoom*=gesture.distance/previous.distance;
        }
      } else if (e.shiftKey || (e.buttons&2)) { camera.panX+=dx*unit; camera.panY-=dy*unit; }
      else { camera.yaw-=dx*0.008; camera.pitch+=dy*0.008; }
      clamp(); render();
    });
    canvas.addEventListener('pointerup',function(e) {
      if (!pointers.has(e.pointerId)) return;
      if (!moved && pointers.size===1) {
        var rect=canvas.getBoundingClientRect();
        onSelect(pick(result,camera,rect.width,rect.height,e.clientX-rect.left,e.clientY-rect.top));
      }
      pointers.delete(e.pointerId); startGesture();
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointercancel',function(e) { pointers.delete(e.pointerId); moved=true; startGesture(); });
    canvas.addEventListener('contextmenu',function(e) { e.preventDefault(); });
    canvas.addEventListener('wheel',function(e) { e.preventDefault(); zoom(Math.exp(-e.deltaY*0.001)); },{passive:false});
    canvas.addEventListener('keydown',function(e) {
      var keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'];
      if (keys.indexOf(e.key)<0) return; e.preventDefault();
      if (e.key==='+' || e.key==='=') return zoom(1.2);
      if (e.key==='-') return zoom(1/1.2);
      if (e.key==='0') return reset();
      var dx=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0, dy=e.key==='ArrowUp'?1:e.key==='ArrowDown'?-1:0;
      if (e.shiftKey) { camera.panX+=dx*0.1/camera.zoom; camera.panY+=dy*0.1/camera.zoom; }
      else { camera.yaw+=dx*0.15; camera.pitch+=dy*0.15; }
      clamp(); render();
    });
    canvas.addEventListener('webglcontextlost',function(e) { e.preventDefault(); onStatus('3D view interrupted. Results and JSON export are still available.'); });
    canvas.addEventListener('webglcontextrestored',function() { try { init(); render(); } catch(error) { onStatus(error.message); } });
    if (typeof ResizeObserver!=='undefined') new ResizeObserver(render).observe(canvas);
    else root.addEventListener('resize',render);
    try { init(); render(); } catch(error) { gl=null; onStatus(error.message); }
    return {
      setResult:function(value) { result=value; selected=-1; geometryDirty=true; selectionDirty=true; reset(); },
      select:function(index) { if(selected!==index) { selected=index; selectionDirty=true; } render(); },
      zoom:zoom, reset:reset,
      snapshot:function(callback) {
        if (!gl || gl.isContextLost()) return callback(null);
        render(); canvas.toBlob(callback,'image/png');
      }
    };
  }
  return { create:create, colorFor:colorFor, basis:basis, bounds:bounds, project:project, pick:pick };
});
