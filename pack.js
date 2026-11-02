/* JavaScript conversion of https://github.com/wknechtel/3d-bin-pack/ */
(function(root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BinPacking = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
'use strict';

// Process bottom-up in original Y coordinates. Earlier boxes can only move down,
// so the highest overlapping top face below the original base is the first stop.
// Positive footprint area is required: touching an edge cannot block a fall.
function settlePlacements(placements) {
  var settled = [];
  var movedCount = 0, totalDrop = 0;
  placements.slice().sort(function(a, b) { return a.position.y - b.position.y; }).forEach(function(item) {
    var p = item.position, d = item.dimensions, landing = 0;
    settled.forEach(function(below) {
      var q = below.position, e = below.dimensions;
      if (p.x < q.x + e.width && q.x < p.x + d.width &&
          p.z < q.z + e.depth && q.z < p.z + d.depth) {
        landing = Math.max(landing, q.y + e.height);
      }
    });
    if (landing < p.y) {
      movedCount++;
      totalDrop += p.y - landing;
      p.y = landing;
    }
    settled.push(item);
  });
  return { movedCount: movedCount, totalDrop: totalDrop };
}

function pack(input) {
var packing, layerdone, evened, variant, bestvariant, hundredpercent, quit;
var boxx, boxy, boxz, boxi, bboxx, bboxy, bboxz, bboxi;
var cboxx, cboxy, cboxz, cboxi, bfx, bfy, bfz, bbfx, bbfy, bbfz;
var xx, yy, zz, px, py, pz, tbn, x, layerlistlen, layerinlayer;
var prelayer, lilz, itenum, layersindex, remainpy, remainpz;
var packedy, prepackedy, layerthickness, itelayer, preremainpy;
var bestite, packednumbox, bestpackednum, packedvolume, bestvolume;
var totalvolume, totalboxvol, temp;
var hasRotationRules = false;
var preferWideLayers = false;
var searchMode;
// Each row maps internal axes back to the caller's original X/Y/Z axes.
var variantAxes = [null, [0,1,2], [2,1,0], [1,2,0], [1,0,2], [0,2,1], [2,0,1]];

function boxinfo(){
	this.rotation = null;
	this.orientations = null;
	this.packst = null;
   	this.dim1 = null;
   	this.dim2 = null;
   	this.dim3 = null;
   	this.n = null;
   	this.cox = null;
   	this.coy = null;
   	this.coz = null;
   	this.packx = null;
   	this.packy = null;
   	this.packz = null;
  	this.vol = null;
};

var bestboxes = [];
var nextUnpacked = [];
var boxlist = new Array();
boxlist[0] = new boxinfo();

function layerlist(){
	this.layereval = "";
   	this.layerdim = "";
};
var layers = new Array();

function scrappad(){
  	this.pre = "";
  	this.pos = "";
   	this.cumx = "";
   	this.cumz = "";
};

var scrapfirst, scrapmemb, smallestz, trash;



// Quick Sort
var swap = function(items, firstIndex, secondIndex){
    var temp = items[firstIndex];
    items[firstIndex] = items[secondIndex];
    items[secondIndex] = temp;
}
var partition = function(items, left, right) {
    var pivot   = items[Math.floor((right + left) / 2)].layereval,
        i       = left,
        j       = right;
    while (i <= j) {
        while (items[i].layereval < pivot) { i++; }
        while (items[j].layereval > pivot) { j--; }
        if (i <= j) {
            swap(items, i, j);
            i++;
            j--;
        }
    }
    return i;
}
var qsort = function(items, left, right) {
    var index;
    if (items.length > 1) {
        left = typeof left != "number" ? 0 : left;
        right = typeof right != "number" ? items.length - 1 : right;
        index = partition(items, left, right);
        if (left < index - 1) {
            qsort(items, left, index - 1);
        }
        if (index < right) {
            qsort(items, index, right);
        }
    }
    return items;
}


//********************************************************
// PERFORMS INITIALIZATIONS
//********************************************************

var initialize = function(){
	readInput();

	temp = 1.0;
	totalvolume = positiveNumber(temp * xx * yy * zz, "Container volume");

	totalboxvol = 0.0;
	for (x=1; x <= tbn; x++) {
	totalboxvol = positiveNumber(totalboxvol + boxlist[x].vol, "Total box volume");
	}

	scrapfirst = new scrappad();

	scrapfirst.pre = null;
	scrapfirst.pos = null;
	bestvolume = 0.0;
	bestpackednum = 0;
	bestvariant = 1;
	bestite = 0;
	bestboxes = boxlist.map(copybox);
	hundredpercent = 0;
	itenum = 0;
	quit = 0;
}


//**********************************************************************
// VALIDATES THE CONTAINER AND ITEM DATA PROVIDED BY THE CALLER
//**********************************************************************

// Copy values rather than inheriting mutable packing state from another item.
var copybox = function(box){
	var copy = new boxinfo();
	Object.keys(copy).forEach(function(key){ copy[key] = box[key]; });
	return copy;
};

function positiveNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(name + ' must be a positive finite number.');
  }
  return value;
}

function dimensions(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(name + ' must be an object with width, height, and depth.');
  }
  return {
    width: positiveNumber(value.width, name + '.width'),
    height: positiveNumber(value.height, name + '.height'),
    depth: positiveNumber(value.depth, name + '.depth')
  };
}

// Enumerate in the legacy order so free-rotation search decisions remain unchanged.
function orientationsFor(box, currentVariant) {
  var w = box.dim1, h = box.dim2, d = box.dim3;
  var candidates = w === h && h === d ? [[w,h,d]] :
    [[w,h,d], [w,d,h], [h,w,d], [h,d,w], [d,w,h], [d,h,w]];
  if (box.rotation === 'free') return candidates;
  var axes = variantAxes[currentVariant];
  return candidates.filter(function(size) {
    var world = [size[axes[0]], size[axes[1]], size[axes[2]]];
    if (box.rotation === 'fixed') return world[0] === w && world[1] === h && world[2] === d;
    return world[1] === h && ((world[0] === w && world[2] === d) || (world[0] === d && world[2] === w));
  });
}

function canMakeLayer(box, height) {
  return box.orientations.some(function(size) {
    return size[1] === height && size[0] <= px && size[2] <= pz;
  });
}

function heightDifference(box, height) {
  if (box.rotation === 'free') {
    return Math.min(Math.abs(height-box.dim1), Math.abs(height-box.dim2), Math.abs(height-box.dim3));
  }
  var difference = Infinity;
  box.orientations.forEach(function(size) {
    difference = Math.min(difference, Math.abs(height - size[1]));
  });
  return difference;
}

var identities = [];
var container;
function readInput() {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('pack expects an object with container and items.');
  }
  var requestedSearch = input.search;
  searchMode = requestedSearch === undefined ? 'standard' : requestedSearch;
  if (searchMode !== 'standard' && searchMode !== 'extended') {
    throw new TypeError('search must be standard or extended.');
  }
  if (input.settle !== undefined && typeof input.settle !== 'boolean') {
    throw new TypeError('settle must be a boolean.');
  }
  container = dimensions(input.container, 'container');
  if (!Array.isArray(input.items)) throw new TypeError('items must be an array.');
  xx = container.width;
  yy = container.height;
  zz = container.depth;
  tbn = 0;
  for (var itemIndex = 0; itemIndex < input.items.length; itemIndex++) {
    var item = input.items[itemIndex];
    var size = dimensions(item, 'items[' + itemIndex + ']');
    var quantity = item.quantity === undefined ? 1 : item.quantity;
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new TypeError('Item quantity must be a positive safe integer.');
    }
    var id = item.id === undefined ? itemIndex : item.id;
    if (typeof id !== 'string' && (typeof id !== 'number' || !Number.isFinite(id))) {
      throw new TypeError('Item id must be a string or finite number.');
    }
    var rotation = item.rotation === undefined ? 'free' : item.rotation;
    if (rotation !== 'free' && rotation !== 'upright' && rotation !== 'fixed') {
      throw new TypeError('Item rotation must be free, upright, or fixed.');
    }
    if (rotation !== 'free') hasRotationRules = true;
    var volume = positiveNumber(size.width * size.height * size.depth, 'Box volume');
    for (var instanceIndex = 0; instanceIndex < quantity; instanceIndex++) {
      var box = new boxinfo();
      box.dim1 = size.width;
      box.dim2 = size.height;
      box.dim3 = size.depth;
      box.vol = volume;
      box.n = quantity;
      box.rotation = rotation;
      box.orientations = orientationsFor(box, 1);
      boxlist[++tbn] = box;
      identities[tbn] = { id: id, itemIndex: itemIndex, instanceIndex: instanceIndex };
    }
  }
  boxlist[tbn + 1] = new boxinfo();
}

//**********************************************************************
// ITERATIONS ARE DONE AND PARAMETERS OF THE BEST SOLUTION ARE
// FOUND
//**********************************************************************

var execiterations = function(){

  	for (variant = 1; (variant <= 6) && !quit; variant++) {

		switch(variant){
	    	case 1:
	        	px=xx; py=yy; pz=zz;
	        	break;
	      	case 2:
	        	px=zz; py=yy; pz=xx;
	        	break;
	      	case 3:
	        	px=zz; py=xx; pz=yy;
	        	break;
	      	case 4:
	        	px=yy; py=xx; pz=zz;
	        	break;
	      	case 5:
	        	px=xx; py=zz; pz=yy;
	        	break;
	      	case 6:
	        	px=yy; py=zz; pz=xx;
	        	break;
	    }

	    for (x = 1; x <= tbn; x++) boxlist[x].orientations = orientationsFor(boxlist[x], variant);
	    listcanditlayers();
	    layers[0] = new layerlist();
	    layers[0].layereval = -1;
	    qsort(layers);

	    for (layersindex = 1; (layersindex <= layerlistlen) && !quit; layersindex++) {
	      	++itenum;


			packedvolume = 0.0;
			packedy = 0;
			packing = 1;
			layerthickness = layers[layersindex].layerdim;
			itelayer = layersindex;
			remainpy = py;
			remainpz = pz;
			packednumbox = 0;
			// Packing flags are monotone within a trial; cursors must reset between trials.
			nextUnpacked = [];

			for (x = 1; x <= tbn; x++)
			{
			boxlist[x].packst=0;
			}

	      	//BEGIN DO-WHILE
	      	do {
		        layerinlayer = 0;
		        layerdone = 0;

		        packlayer();

				packedy = packedy + layerthickness;
		        remainpy = py - packedy;

				if (layerinlayer && !quit) {

					prepackedy = packedy;
					preremainpy = remainpy;
		        	remainpy = layerthickness - prelayer;
		        	packedy = packedy - layerthickness + prelayer;
	        		remainpz = lilz;
	        		layerthickness = layerinlayer;
	        		layerdone = 0;

		        	packlayer();

					packedy = prepackedy;
		        	remainpy = preremainpy;
		        	remainpz = pz;
		        }
		        findlayer(remainpy);

			} while (packing && !quit);
	    	// END DO-WHILE

	    	if ((packedvolume > bestvolume) && !quit) {
	        	bestvolume = packedvolume;
	        	bestvariant = variant;
	        	bestite = itelayer;
	        	bestpackednum = packednumbox;
				bestboxes = boxlist.map(copybox);
	    	}

	    	if (hundredpercent) break;

	    }
	    if (hundredpercent) break;
	    if (!hasRotationRules && (xx == yy) && (yy == zz)) variant = 6;
	}
}

//**********************************************************************
// LISTS ALL POSSIBLE LAYER HEIGHTS BY GIVING A WEIGHT VALUE TO
// EACH OF THEM.
//**********************************************************************
var listcanditlayers = function(){
  layerlistlen = 0;
  layers = [new layerlist()];
  for (x = 1; x <= tbn; x++) {
    var heights = [boxlist[x].dim1, boxlist[x].dim2, boxlist[x].dim3];
    for (var y = 0; y < heights.length; y++) {
      var height = heights[y];
      if (height > py || !canMakeLayer(boxlist[x], height)) continue;
      var same = false;
      for (var k = 1; k <= layerlistlen; k++) {
        if (height === layers[k].layerdim) same = true;
      }
      if (same) continue;
      var evaluation = 0;
      for (var z = 1; z <= tbn; z++) {
        if (x !== z) evaluation += heightDifference(boxlist[z], height);
      }
      var layer = new layerlist();
      layer.layereval = evaluation;
      layer.layerdim = height;
      layers[++layerlistlen] = layer;
    }
  }
};

//**********************************************************************
// PACKS THE BOXES FOUND AND ARRANGES ALL VARIABLES AND
// RECORDS PROPERLY
//**********************************************************************

var packlayer = function(){
	var lenx, lenz, lpz;

	if (!layerthickness){
    	packing = 0;
    	return 0;
	}

	scrapfirst.cumx = px;
	scrapfirst.cumz = 0;

	for(;!quit;){

    	findsmallestz();

    	if (!(smallestz.pre) && !(smallestz.pos) ){
		//*** SITUATION-1: NO BOXES ON THE RIGHT AND LEFT SIDES ***

			lenx = smallestz.cumx;
			lpz = remainpz - smallestz.cumz;
			findbox(lenx, layerthickness, remainpy, lpz, lpz);
			checkfound();

			if (layerdone) break;
			if (evened) continue;

			boxlist[cboxi].cox = 0;
			boxlist[cboxi].coy = packedy;
			boxlist[cboxi].coz = smallestz.cumz;
			if (cboxx == smallestz.cumx){
				smallestz.cumz = smallestz.cumz + cboxz;
			} else {
        		smallestz.pos = new scrappad();

		        smallestz.pos.pos = null;
		        smallestz.pos.pre = smallestz;
		        smallestz.pos.cumx = smallestz.cumx;
		        smallestz.pos.cumz = smallestz.cumz;
		        smallestz.cumx = cboxx;
		        smallestz.cumz = smallestz.cumz + cboxz;
			}
			volumecheck();
    	} else if (!(smallestz.pre) ) {
		//*** SITUATION-2: NO BOXES ON THE LEFT SIDE ***

			lenx = smallestz.cumx;
			lenz = smallestz.pos.cumz - smallestz.cumz;
			lpz = remainpz - smallestz.cumz;
			findbox(lenx, layerthickness, remainpy, lenz, lpz);
			checkfound();

			if (layerdone) break;
			if (evened) continue;

			boxlist[cboxi].coy = packedy;
			boxlist[cboxi].coz = smallestz.cumz;
			if (cboxx == smallestz.cumx){

				boxlist[cboxi].cox = 0;
	        	if ( smallestz.cumz + cboxz == smallestz.pos.cumz ) {
					smallestz.cumz = smallestz.pos.cumz;
					smallestz.cumx = smallestz.pos.cumx;
					trash = smallestz.pos;
					smallestz.pos = smallestz.pos.pos;

					if (smallestz.pos) {
						smallestz.pos.pre = smallestz;
					}
	        	} else {
					smallestz.cumz = smallestz.cumz + cboxz;
	        	}
			} else {
	        	boxlist[cboxi].cox = smallestz.cumx - cboxx;
	        	if ( smallestz.cumz + cboxz == smallestz.pos.cumz ) {
					smallestz.cumx = smallestz.cumx - cboxx;
	        	} else {
					smallestz.pos.pre = new scrappad();

					smallestz.pos.pre.pos = smallestz.pos;
					smallestz.pos.pre.pre = smallestz;
					smallestz.pos = smallestz.pos.pre;
					smallestz.pos.cumx = smallestz.cumx;
					smallestz.cumx = smallestz.cumx - cboxx;
					smallestz.pos.cumz = smallestz.cumz + cboxz;
				}
			}
			volumecheck();
    	} else if (!smallestz.pos) {
		//*** SITUATION-3: NO BOXES ON THE RIGHT SIDE ***

			lenx = smallestz.cumx - smallestz.pre.cumx;
			lenz = smallestz.pre.cumz - smallestz.cumz;
			lpz = remainpz - smallestz.cumz;
			findbox(lenx, layerthickness, remainpy, lenz, lpz);
			checkfound();

			if (layerdone) break;
			if (evened) continue;

			boxlist[cboxi].coy = packedy;
			boxlist[cboxi].coz = smallestz.cumz;
			boxlist[cboxi].cox = smallestz.pre.cumx;

			if (cboxx == smallestz.cumx - smallestz.pre.cumx) {

				if ( smallestz.cumz + cboxz == smallestz.pre.cumz ) {
					smallestz.pre.cumx = smallestz.cumx;
					smallestz.pre.pos = null;
        		} else {
					smallestz.cumz = smallestz.cumz + cboxz;
        		}
    		} else {
				if ( smallestz.cumz + cboxz == smallestz.pre.cumz ) {
					smallestz.pre.cumx = smallestz.pre.cumx + cboxx;
        		} else {
					smallestz.pre.pos = new scrappad();

					smallestz.pre.pos.pre = smallestz.pre;
					smallestz.pre.pos.pos = smallestz;
					smallestz.pre = smallestz.pre.pos;
					smallestz.pre.cumx = smallestz.pre.pre.cumx + cboxx;
					smallestz.pre.cumz = smallestz.cumz + cboxz;
				}
			}
			volumecheck();

		} else if ( smallestz.pre.cumz == smallestz.pos.cumz ) {
		//*** SITUATION-4: THERE ARE BOXES ON BOTH OF THE SIDES ***

		//*** SUBSITUATION-4A: SIDES ARE EQUAL TO EACH OTHER ***

			lenx = smallestz.cumx - smallestz.pre.cumx;
			lenz = smallestz.pre.cumz - smallestz.cumz;
			lpz = remainpz - smallestz.cumz;

			findbox(lenx, layerthickness, remainpy, lenz, lpz);
			checkfound();

			if (layerdone) break;
			if (evened) continue;

			boxlist[cboxi].coy = packedy;
			boxlist[cboxi].coz = smallestz.cumz;
			if ( cboxx == smallestz.cumx - smallestz.pre.cumx ) {
        		boxlist[cboxi].cox = smallestz.pre.cumx;
				if ( smallestz.cumz + cboxz == smallestz.pos.cumz ) {
					smallestz.pre.cumx = smallestz.pos.cumx;
					if ( smallestz.pos.pos ) {
						smallestz.pre.pos = smallestz.pos.pos;
						smallestz.pos.pos.pre = smallestz.pre;
					} else {
						smallestz.pre.pos = null;
					}
				} else {
					smallestz.cumz = smallestz.cumz + cboxz;
				}
			} else if ( smallestz.pre.cumx < px - smallestz.cumx ) {
				if ( smallestz.cumz + cboxz == smallestz.pre.cumz) {
					boxlist[cboxi].cox = smallestz.cumx - cboxx;
					smallestz.cumx = smallestz.cumx - cboxx;
				} else {
					boxlist[cboxi].cox = smallestz.pre.cumx;
					smallestz.pre.pos = new scrappad();

					smallestz.pre.pos.pre = smallestz.pre;
					smallestz.pre.pos.pos = smallestz;
					smallestz.pre = smallestz.pre.pos;
					smallestz.pre.cumx = smallestz.pre.pre.cumx + cboxx;
					smallestz.pre.cumz = smallestz.cumz + cboxz;
        		}
			} else {
        		if ( smallestz.cumz + cboxz == smallestz.pre.cumz ) {
					boxlist[cboxi].cox = smallestz.pre.cumx;
					smallestz.pre.cumx = smallestz.pre.cumx + cboxx;
        		} else {
					boxlist[cboxi].cox = smallestz.cumx - cboxx;
					smallestz.pos.pre = new scrappad();

					smallestz.pos.pre.pos = smallestz.pos;
					smallestz.pos.pre.pre = smallestz;
					smallestz.pos = smallestz.pos.pre;
					smallestz.pos.cumx = smallestz.cumx;
					smallestz.pos.cumz = smallestz.cumz + cboxz;
					smallestz.cumx = smallestz.cumx - cboxx;
        		}
			}
			volumecheck();
		} else {
		//*** SUBSITUATION-4B: SIDES ARE NOT EQUAL TO EACH OTHER ***

			lenx = smallestz.cumx - smallestz.pre.cumx;
			lenz = smallestz.pre.cumz - smallestz.cumz;
			lpz = remainpz - smallestz.cumz;
			findbox(lenx, layerthickness, remainpy, lenz, lpz);
			checkfound();

			if (layerdone) break;
			if (evened) continue;

			boxlist[cboxi].coy = packedy;
			boxlist[cboxi].coz = smallestz.cumz;
			boxlist[cboxi].cox = smallestz.pre.cumx;
			if ( cboxx == (smallestz.cumx - smallestz.pre.cumx) ) {
				if ( (smallestz.cumz + cboxz) == smallestz.pre.cumz) {
					smallestz.pre.cumx = smallestz.cumx;
					smallestz.pre.pos = smallestz.pos;
					smallestz.pos.pre = smallestz.pre;
        		} else {
					smallestz.cumz = smallestz.cumz + cboxz;
        		}
			} else {
        		if ( (smallestz.cumz + cboxz) == smallestz.pre.cumz ) {
					smallestz.pre.cumx = smallestz.pre.cumx + cboxx;
        		} else if ( smallestz.cumz + cboxz == smallestz.pos.cumz ) {
					boxlist[cboxi].cox = smallestz.cumx - cboxx;
					smallestz.cumx = smallestz.cumx - cboxx;
        		} else {
					smallestz.pre.pos = new scrappad();

					smallestz.pre.pos.pre = smallestz.pre;
					smallestz.pre.pos.pos = smallestz;
					smallestz.pre = smallestz.pre.pos;
					smallestz.pre.cumx = smallestz.pre.pre.cumx + cboxx;
					smallestz.pre.cumz = smallestz.cumz + cboxz;
        		}
			}
			volumecheck();
    	}
	}
	return 0;
}

//**********************************************************************
// FINDS THE MOST PROPER LAYER HIGHT BY LOOKING AT THE UNPACKED
// BOXES AND THE REMAINING EMPTY SPACE AVAILABLE
//**********************************************************************

var findlayer = function(thickness) {
  layerthickness = 0;
  var bestLayerEval = Infinity;
  // All eligible boxes have zero heightDifference at this height. Excluding
  // a different candidate therefore removes only a zero term from the same
  // ordered sum. Reuse that score without changing candidate/tie order.
  // The unpacked set changes between calls, so keep this cache local.
  var evaluations = new Map();
  for (x = 1; x <= tbn; x++) {
    if (boxlist[x].packst) continue;
    var heights = [boxlist[x].dim1, boxlist[x].dim2, boxlist[x].dim3];
    for (var y = 0; y < heights.length; y++) {
      var height = heights[y];
      if (height > thickness || !canMakeLayer(boxlist[x], height)) continue;
      var evaluation = evaluations.get(height);
      if (evaluation === undefined) {
        evaluation = 0;
        for (var z = 1; z <= tbn; z++) {
          if (x !== z && !boxlist[z].packst) evaluation += heightDifference(boxlist[z], height);
        }
        evaluations.set(height, evaluation);
      }
      if (evaluation < bestLayerEval) {
        bestLayerEval = evaluation;
        layerthickness = height;
      }
    }
  }
  if (layerthickness === 0 || layerthickness > remainpy) packing = 0;
  return 0;
};

//**********************************************************************
// FINDS THE MOST PROPER BOXES BY LOOKING AT ALL SIX POSSIBLE
// ORIENTATIONS, EMPTY SPACE GIVEN, ADJACENT BOXES, AND PALLET LIMITS
//**********************************************************************

var findbox = function( hmx,  hy,  hmy,  hz,  hmz)
{
   var y;
  bfx = Infinity; bfy = Infinity; bfz = Infinity;
  bbfx = Infinity; bbfy = Infinity; bbfz = Infinity;
  boxi = 0; bboxi = 0;
  for (y = 1; y <= tbn; y = y + boxlist[y].n)
  {
    // Keep the original first-unpacked choice and item-type order without
    // rescanning the packed prefix of this quantity group on every lookup.
    if (boxlist[y].n === 1) {
      if (boxlist[y].packst) continue;
      x = y;
    } else {
      x = nextUnpacked[y] === undefined ? y : nextUnpacked[y];
      while (x < y + boxlist[y].n && boxlist[x].packst) x++;
      nextUnpacked[y] = x;
      if (x >= y + boxlist[y].n || x > tbn) continue;
    }
    boxlist[x].orientations.forEach(function(size) {
      analyzebox(hmx, hy, hmy, hz, hmz, size[0], size[1], size[2]);
    });
  }
}

//**********************************************************************
// ANALYZES EACH UNPACKED BOX TO FIND THE BEST FITTING ONE TO
// THE EMPTY SPACE GIVEN
//**********************************************************************

var analyzebox = function( hmx,  hy,  hmy,  hz,  hmz,  dim1,  dim2,  dim3)
{
  if (dim1 <= hmx && dim2 <= hmy && dim3 <= hmz)
  {
    if (dim2 <= hy)
    {
      if (hy - dim2 < bfy)
      {
        boxx = dim1;
        boxy = dim2;
        boxz = dim3;
        bfx = hmx - dim1;
        bfy = hy - dim2;
        bfz = Math.abs(hz - dim3);
        boxi = x;
      }
      else if (hy - dim2 == bfy && hmx - dim1 < bfx)
      {
        boxx = dim1;
        boxy = dim2;
        boxz = dim3;
        bfx = hmx - dim1;
        bfy = hy - dim2;
        bfz = Math.abs(hz - dim3);
        boxi = x;
      }
      else if (hy - dim2 == bfy && hmx - dim1 == bfx && Math.abs(hz - dim3) < bfz)
      {
        boxx = dim1;
        boxy = dim2;
        boxz = dim3;
        bfx = hmx - dim1;
        bfy = hy - dim2;
        bfz = Math.abs(hz - dim3);
        boxi = x;
      }
    }
    else
    {
      // The optional second pass favors wide layer-growing boxes, then volume.
      // Keep the legacy fitting-box ranking and default oversize ranking intact.
      if (preferWideLayers) {
        var volume = boxlist[x].vol;
        var selectedVolume = bboxi ? boxlist[bboxi].vol : 0;
        var widthGap = hmx - dim1, heightExcess = dim2 - hy;
        var depthGap = Math.abs(hz - dim3);
        if (widthGap < bbfx ||
            (widthGap === bbfx && (volume > selectedVolume ||
             (volume === selectedVolume && (heightExcess < bbfy ||
              (heightExcess === bbfy && depthGap < bbfz)))))) {
          bboxx = dim1; bboxy = dim2; bboxz = dim3;
          bbfx = widthGap; bbfy = heightExcess; bbfz = depthGap; bboxi = x;
        }
        return;
      }
      if (dim2 - hy < bbfy)
      {
        bboxx = dim1;
        bboxy = dim2;
        bboxz = dim3;
        bbfx = hmx - dim1;
        bbfy = dim2-hy;
        bbfz = Math.abs(hz - dim3);
        bboxi = x;
      }
      else if (dim2 - hy == bbfy && hmx - dim1 < bbfx)
      {
        bboxx = dim1;
        bboxy = dim2;
        bboxz = dim3;
        bbfx = hmx - dim1;
        bbfy = dim2 - hy;
        bbfz = Math.abs(hz - dim3);
        bboxi = x;
      }
      else if (dim2 - hy == bbfy && hmx-dim1 == bbfx && Math.abs(hz - dim3) < bbfz)
      {
        bboxx = dim1;
        bboxy = dim2;
        bboxz = dim3;
        bbfx = hmx - dim1;
        bbfy = dim2 - hy;
        bbfz = Math.abs(hz - dim3);
        bboxi = x;
      }
    }
  }
}

//********************************************************
// FINDS THE FIRST TO BE PACKED GAP IN THE LAYER EDGE
//********************************************************
var findsmallestz = function(){
	scrapmemb = scrapfirst;
	smallestz = scrapmemb;

	while (scrapmemb.pos != null){
    	if ( scrapmemb.pos.cumz < smallestz.cumz ){
			smallestz = scrapmemb.pos;
    	}
    	scrapmemb = scrapmemb.pos;
	}
	return;
}

//************************************************************
// AFTER FINDING EACH BOX, THE CANDIDATE BOXES AND THE
// CONDITION OF THE LAYER ARE EXAMINED
//************************************************************

var checkfound = function()
{
  evened = 0;
  if (boxi)
  {
    cboxi = boxi;
    cboxx = boxx;
    cboxy = boxy;
    cboxz = boxz;
  }
  else
  {
    if ( (bboxi > 0) && (layerinlayer || (!smallestz.pre && !smallestz.pos)) )
    {
      if (!layerinlayer)
      {
        prelayer = layerthickness;
        lilz = smallestz.cumz;
      }
      cboxi = bboxi;
      cboxx = bboxx;
      cboxy = bboxy;
      cboxz = bboxz;
      layerinlayer = layerinlayer + bboxy - layerthickness;
      layerthickness = bboxy;
    }
    else
    {
      if ( !smallestz.pre && !smallestz.pos )
      {
        layerdone = 1;
      }
      else
      {
        evened = 1;
        if (!smallestz.pre)
        {
          trash = smallestz.pos;
          smallestz.cumx = smallestz.pos.cumx;
          smallestz.cumz = smallestz.pos.cumz;
          smallestz.pos = smallestz.pos.pos;
          if (smallestz.pos)
          {
            smallestz.pos.pre = smallestz;
          }
        }
        else if (!smallestz.pos)
        {
          smallestz.pre.pos = null;
          smallestz.pre.cumx = smallestz.cumx;
        }
        else
        {
          if ( smallestz.pre.cumz == smallestz.pos.cumz )
          {
            smallestz.pre.pos = smallestz.pos.pos;
            if (smallestz.pos.pos)
            {
              smallestz.pos.pos.pre = smallestz.pre;
            }
            smallestz.pre.cumx = smallestz.pos.cumx;


          }
          else
          {
            smallestz.pre.pos = smallestz.pos;
            smallestz.pos.pre = smallestz.pre;
            if (smallestz.pre.cumz < smallestz.pos.cumz)
            {
              smallestz.pre.cumx = smallestz.cumx;
            }
          }
        }
      }
    }
  }
  return;
}

//********************************************************************
// AFTER PACKING OF EACH BOX, 100% PACKING CONDITION IS CHECKED
//********************************************************************

var volumecheck = function()
{
  boxlist[cboxi].packst = 1;
  boxlist[cboxi].packx = cboxx;
  boxlist[cboxi].packy = cboxy;
  boxlist[cboxi].packz = cboxz;
  packedvolume = packedvolume + boxlist[cboxi].vol;
  packednumbox++;
  if (packedvolume == totalvolume || packedvolume == totalboxvol)
  {
    packing = 0;
    hundredpercent = 1;
  }
  return  ;
}


initialize();
execiterations();
var searchPasses = 1;
if (searchMode === 'extended' && bestvolume < Math.min(totalvolume, totalboxvol)) {
  preferWideLayers = true;
  searchPasses++;
  // Keep the saved standard winner. Only a strictly larger volume replaces it.
  execiterations();
}

// Map the saved winner back to the caller's original container axes.
var axes = variantAxes[bestvariant];
var placements = [];
var unpacked = [];
for (var index = 1; index <= tbn; index++) {
  var box = bestboxes[index];
  var identity = identities[index];
  var entry = {
    id: identity.id,
    itemIndex: identity.itemIndex,
    instanceIndex: identity.instanceIndex
  };
  if (box.rotation !== 'free') entry.rotation = box.rotation;
  if (box.packst) {
    var position = [box.cox, box.coy, box.coz];
    var size = [box.packx, box.packy, box.packz];
    entry.position = { x: position[axes[0]], y: position[axes[1]], z: position[axes[2]] };
    entry.dimensions = { width: size[axes[0]], height: size[axes[1]], depth: size[axes[2]] };
    placements.push(entry);
  } else {
    entry.dimensions = { width: box.dim1, height: box.dim2, depth: box.dim3 };
    unpacked.push(entry);
  }
}
var diagnostics = { iterations: itenum };
if (searchMode === 'extended') diagnostics.search = { mode: 'extended', passes: searchPasses };
if (input.settle === true) diagnostics.settling = settlePlacements(placements);
return {
  container: container,
  placements: placements,
  unpacked: unpacked,
  totalCount: tbn,
  packedCount: bestpackednum,
  containerVolume: totalvolume,
  totalItemVolume: totalboxvol,
  packedVolume: bestvolume,
  utilization: bestvolume / totalvolume,
  diagnostics: diagnostics
};
}

return { pack: pack };
});
