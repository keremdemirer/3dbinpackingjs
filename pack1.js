/* Original File
	https://raw.githubusercontent.com/wknechtel/3d-bin-pack/master/src/binpack.c

*/

var initialize = function(){},
	inputboxlist = function(){},
	execiterations = function(){},
	listcanditlayers = function(){},
	complayerlist = function(i, j){},
	packlayer = function(){},
	findlayer = function(thickness){},
	findbox = function(hmx, hy, hmy, hz, hmz){},
	analyzebox = function(hmx, hy, hmy, hz, hmz, dim1, dim2, dim3){},
	findsmallestz = function(){},
	checkfound = function(){},
	volumecheck = function(){},
	graphunpackedout = function(){},
	outputboxlist = function(){},
	report = function(){},

//********************************************************
// VARIABLE, CONSTANT AND STRUCTURE DECLARATIONS
//********************************************************

	strpx = '',
	strpy = '',
	strpz = '',
	strcox = '',
	strcoy = '',
	strcoz = '',
	strpackx = '',
	strpacky = '',
	strpackz = '',
	filename = '',
	strtemp = '',
	packing = '',
	layerdone = '',
	evened = '',
	variant = '',
	bestvariant = '',
	packingbest = '',
	hundredpercent = '',
	graphout = "visudat",
	unpacked = '',
	quit = '',

	boxx, boxy, boxz, boxi,
	bboxx, bboxy, bboxz, bboxi,
	cboxx, cboxy, cboxz, cboxi,
	bfx, bfy, bfz,
	bbfx, bbfy, bbfz,
	xx, yy, zz,
	px, py, pz,
	tbn,
	x,
	n,
	layerlistlen,
	layerinlayer,
 	prelayer,
 	lilz,
 	itenum,
 	hour,
 	min,
 	sec,
 	layersindex,
	remainpx, remainpy, remainpz,
	packedy,
 	prepackedy,
 	layerthickness,
 	itelayer,
 	preremainpy,
 	bestite,
 	packednumbox,
 	bestpackednum,

	packedvolume,
	bestvolume,
  	totalvolume,
  	totalboxvol,
  	temp,
  	percentageused,
  	percentagepackedbox,
  	elapsedtime;

function boxinfo(){
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

var start, finish;

var ifp,  gfp;


/*
Compability functions for converting from C to Javascript by Can Bayraktar
*/
// Console replacement (also console.log can be used)
var sc = document.getElementById('screen');
var printf = function(){
	for(i = 0; i < arguments.length; i+=1){
		sc.innerHTML += arguments[i] + ' ';
	}
	sc.innerHTML += '\n';
}

// Ascii to integer
var atoi = function(a){ return (+a); };

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
// MAIN PROGRAM
//********************************************************

function main(){
	initialize(); 		console.log("initialized.");
	execiterations(); 	console.log("execiterations done.");
	report();			console.log("report printed.");
	return 0;
}

//********************************************************
// PERFORMS INITIALIZATIONS
//********************************************************

var initialize = function(){
	inputboxlist();

	temp = 1.0;
	totalvolume = temp * xx * yy * zz;

	totalboxvol = 0.0;
	for (x=1; x <= tbn; x++) {
	totalboxvol = totalboxvol + boxlist[x].vol;
	}

	scrapfirst = new scrappad();

	scrapfirst.pre = null;
	scrapfirst.pos = null;
	bestvolume = 0.0;
	packingbest = 0;
	hundredpercent = 0;
	itenum = 0;
	quit = 0;
}


//**********************************************************************
// READS THE PALLET AND BOX SET DATA ENTERED BY THE USER FROM
// THE INPUT FILE
//**********************************************************************

var inputboxlist = function(){
	var n,
		lbl = "",
		dim1 = "",
		dim2 = "",
		dim3 = "",
		boxn = "",
		strxx = "",
		stryy = "",
		strzz = "";

	tbn = 1;

	strxx = document.getElementById("strxx").value;
    stryy = document.getElementById("stryy").value;
	strzz = document.getElementById("strzz").value;

	xx = atoi(strxx);
	yy = atoi(stryy);
	zz = atoi(strzz);

	var bi = document.getElementsByClassName('box-inputs');

	for(i = 0; i < bi.length; i+=1){
		boxlist[tbn] = new boxinfo();
		boxlist[tbn].dim1 = atoi(bi[i].children.dim1.value);
		boxlist[tbn].dim2 = atoi(bi[i].children.dim2.value);
		boxlist[tbn].dim3 = atoi(bi[i].children.dim3.value);

		boxlist[tbn].vol = boxlist[tbn].dim1 * boxlist[tbn].dim2 * boxlist[tbn].dim3;
		n = atoi(bi[i].children.boxn.value);
		boxlist[tbn].n = n;

		for(j = 1; j < n; j+=1){
			boxlist[tbn+j] = Object.create(boxlist[tbn]);
		}
		tbn += n;
	}
	boxlist[tbn] = new boxinfo();
	--tbn;
	return;
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

	    listcanditlayers();
	    layers[0] = new layerlist();
	    layers[0].layereval = -1;
	    qsort(layers);

	    for (layersindex = 1; (layersindex <= layerlistlen) && !quit; layersindex++) {
	      	++itenum;


			printf("VARIANT: "+variant+"; ITERATION (TOTAL): "+itenum+"; BEST SO FAR: "+percentageused+" %%;");
			packedvolume = 0.0;
			packedy = 0;
			packing = 1;
			layerthickness = layers[layersindex].layerdim;
			itelayer = layersindex;
			remainpy = py;
			remainpz = pz;
			packednumbox = 0;

			for (x = 1; x <= tbn; x++)
			{
			boxlist[x].packst=0;
			}

	      	//BEGIN DO-WHILE
	      	do {
		        layerinlayer = 0;
		        layerdone = 0;

		        if (packlayer()) { exit(1); }

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

		        	if (packlayer()) { exit( 1); }

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
	    	}

	    	if (hundredpercent) break;

			percentageused = bestvolume * 100 / totalvolume;
	    }
	    if (hundredpercent) break;
	    if ((xx == yy) && (yy == zz)) variant = 6;
	}
}

//**********************************************************************
// LISTS ALL POSSIBLE LAYER HEIGHTS BY GIVING A WEIGHT VALUE TO
// EACH OF THEM.
//**********************************************************************
var listcanditlayers = function(){
	var same,
		exdim, dimdif, dimen2, dimen3, y, z, k,
		layereval;

		layerlistlen = 0;

	for (x = 1; x <= tbn; x++){
		for(y = 1; y <= 3; y++){
			switch(y){
    			case 1:
					exdim = boxlist[x].dim1;
					dimen2 = boxlist[x].dim2;
					dimen3 = boxlist[x].dim3;
					break;
    			case 2:
					exdim = boxlist[x].dim2;
					dimen2 = boxlist[x].dim1;
					dimen3 = boxlist[x].dim3;
					break;
    			case 3:
					exdim = boxlist[x].dim3;
					dimen2 = boxlist[x].dim1;
					dimen3 = boxlist[x].dim2;
					break;
			}
			if ((exdim > py) || (((dimen2 > px) || (dimen3 > pz)) && ((dimen3 > px) || (dimen2 > pz)))) continue;
			same = 0;

			for (k = 1; k <= layerlistlen; k++){
    			if (exdim == layers[k].layerdim){
					same = 1;
					continue;
    			}
			}
			if (same) continue;
			layereval = 0;

			for (z = 1; z <= tbn; z++){
    			if(!(x == z)){
					dimdif = Math.abs(exdim - boxlist[z].dim1);

					if ( Math.abs(exdim - boxlist[z].dim2) < dimdif ){
        				dimdif = Math.abs(exdim - boxlist[z].dim2);
					}
					if ( Math.abs(exdim - boxlist[z].dim3) < dimdif ){
        				dimdif = Math.abs(exdim - boxlist[z].dim3);
					}
					layereval = layereval + dimdif;
				}
			}
			layers[++layerlistlen] = new layerlist();
			layers[layerlistlen].layereval = layereval;
			layers[layerlistlen].layerdim = exdim;
		}
	}
  	return;
}

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
					smallestz.cumx = smallestz.cumx - cboxx;
					boxlist[cboxi].cox = smallestz.cumx - cboxx;
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
					smallestz.pre.cumx = smallestz.pre.cumx + cboxx;
					boxlist[cboxi].cox = smallestz.pre.cumx;
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

var findlayer = function( thickness )
{
   var exdim, dimdif, dimen2, dimen3, y, z;
  var layereval, eval;
  layerthickness = 0;
  eval = 1000000;
  for (x=1; x <= tbn; x++)
  {
    if (boxlist[x].packst) continue;
    for( y = 1; y <= 3; y++)
    {
      switch(y)
      {
        case 1:
          exdim = boxlist[x].dim1;
          dimen2 = boxlist[x].dim2;
          dimen3 = boxlist[x].dim3;
          break;
        case 2:
          exdim = boxlist[x].dim2;
          dimen2 = boxlist[x].dim1;
          dimen3 = boxlist[x].dim3;
          break;
       case 3:
          exdim = boxlist[x].dim3;
          dimen2 = boxlist[x].dim1;
          dimen3 = boxlist[x].dim2;
          break;
      }
      layereval = 0;
      if ( (exdim <= thickness) && (((dimen2 <= px) && (dimen3 <= pz)) || ((dimen3 <= px) && (dimen2 <= pz))) )
      {
        for (z = 1; z <= tbn; z++)
        {
          if ( !(x == z) && !(boxlist[z].packst))
          {
            dimdif = Math.abs(exdim - boxlist[z].dim1);
            if ( Math.abs(exdim - boxlist[z].dim2) < dimdif )
            {
              dimdif = Math.abs(exdim - boxlist[z].dim2);
            }
            if ( Math.abs(exdim - boxlist[z].dim3) < dimdif )
            {
              dimdif = Math.abs(exdim - boxlist[z].dim3);
            }
            layereval = layereval + dimdif;
          }
        }
        if (layereval < eval)
        {
          eval = layereval;
          layerthickness = exdim;
        }
      }
    }
  }
  if (layerthickness == 0 || layerthickness > remainpy) packing = 0;
  return 0;
}

//**********************************************************************
// FINDS THE MOST PROPER BOXES BY LOOKING AT ALL SIX POSSIBLE
// ORIENTATIONS, EMPTY SPACE GIVEN, ADJACENT BOXES, AND PALLET LIMITS
//**********************************************************************

var findbox = function( hmx,  hy,  hmy,  hz,  hmz)
{
   var y;
  bfx = 32767; bfy = 32767; bfz = 32767;
  bbfx = 32767; bbfy = 32767; bbfz = 32767;
  boxi = 0; bboxi = 0;
  for (y = 1; y <= tbn; y = y + boxlist[y].n)
  {
    for (x = y; x < x + boxlist[y].n - 1; x++)
    {
      if (!boxlist[x].packst) break;
    }
    if (boxlist[x].packst) continue;
    if (x > tbn) return;
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim1, boxlist[x].dim2, boxlist[x].dim3);
    if ( (boxlist[x].dim1 == boxlist[x].dim3) && (boxlist[x].dim3 == boxlist[x].dim2) ) continue;
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim1, boxlist[x].dim3, boxlist[x].dim2);
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim2, boxlist[x].dim1, boxlist[x].dim3);
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim2, boxlist[x].dim3, boxlist[x].dim1);
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim3, boxlist[x].dim1, boxlist[x].dim2);
    analyzebox(hmx, hy, hmy, hz, hmz, boxlist[x].dim3, boxlist[x].dim2, boxlist[x].dim1);
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

	while ( !scrapmemb.pos == null ){
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
  if (packingbest)
  {
    graphunpackedout();
    outputboxlist();
  }
  else if (packedvolume == totalvolume || packedvolume == totalboxvol)
  {
    packing = 0;
    hundredpercent = 1;
  }
  return  ;
}

//*********************************************************************
// DATA FOR THE VISUALIZATION PROGRAM IS WRITTEN TO THE
// "VISUDAT" FILE AND THE LIST OF UNPACKED BOXES IS
// MERGED TO THE END OF THE REPORT FILE
//*********************************************************************

var graphunpackedout = function()
{
  var n = "";
  if (!unpacked)
  {
    strox = boxlist[cboxi].cox;
    strcoy = boxlist[cboxi].coy;
    strcoz = boxlist[cboxi].coz;
    strpackx = boxlist[cboxi].packx;
    strpacky = boxlist[cboxi].packy;
    strpackz = boxlist[cboxi].packz;
  }
  else
  {
    n = cboxi;
    strpackx = boxlist[cboxi].dim1;
    strpacky = boxlist[cboxi].dim2;
    strpackz = boxlist[cboxi].dim3;
  }
  if (!unpacked)
  {
    printf(strcox, strcoy, strcoz, strpackx, strpacky, strpackz);
  }
  else
  {
    printf(n, strpackx, strpacky, strpackz);
  }
}

//*********************************************************************
// TRANSFORMS THE FOUND COORDINATE SYSTEM TO THE ONE ENTERED
// BY THE USER AND WRITES THEM TO THE REPORT FILE
//*********************************************************************

var outputboxlist = function()
{
  	var strx = "",
  		strpackst = "",
  		strdim1 = "", strdim2 = "", strdim3 = "",
  		strcox = "", strcoy = "", strcoz = "",
  		strpackx = "", strpacky = "", strpackz = "";

   var x, y, z, bx, by, bz;

  switch(bestvariant)
  {
    case 1:
      x = boxlist[cboxi].cox;
      y = boxlist[cboxi].coy;
      z = boxlist[cboxi].coz;
      bx = boxlist[cboxi].packx;
      by = boxlist[cboxi].packy;
      bz = boxlist[cboxi].packz;
      break;
    case 2:
      x = boxlist[cboxi].coz;
      y = boxlist[cboxi].coy;
      z = boxlist[cboxi].cox;
      bx = boxlist[cboxi].packz;
      by = boxlist[cboxi].packy;
      bz = boxlist[cboxi].packx;
      break;
    case 3:
      x = boxlist[cboxi].coy;
      y = boxlist[cboxi].coz;
      z = boxlist[cboxi].cox;
      bx = boxlist[cboxi].packy;
      by = boxlist[cboxi].packz;
      bz = boxlist[cboxi].packx;
      break;
    case 4:
      x = boxlist[cboxi].coy;
      y = boxlist[cboxi].cox;
      z = boxlist[cboxi].coz;
      bx = boxlist[cboxi].packy;
      by = boxlist[cboxi].packx;
      bz = boxlist[cboxi].packz;
      break;
    case 5:
      x = boxlist[cboxi].cox;
      y = boxlist[cboxi].coz;
      z = boxlist[cboxi].coy;
      bx = boxlist[cboxi].packx;
      by = boxlist[cboxi].packz;
      bz = boxlist[cboxi].packy;
      break;
    case 6:
      x = boxlist[cboxi].coz;
      y = boxlist[cboxi].cox;
      z = boxlist[cboxi].coy;
      bx = boxlist[cboxi].packz;
      by = boxlist[cboxi].packx;
      bz = boxlist[cboxi].packy;
      break;
  }

  strx = cboxi;
  strpackst = boxlist[cboxi].packst;
  strdim1 = boxlist[cboxi].dim1;
  strdim2 = boxlist[cboxi].dim2;
  strdim3 = boxlist[cboxi].dim3;
  strcox = x;
  strcoy = y;
  strcoz = z;
  strpackx = bx;
  strpacky = by;
  strpackz = bz;

  boxlist[cboxi].cox = x;
  boxlist[cboxi].coy = y;
  boxlist[cboxi].coz = z;
  boxlist[cboxi].packx = bx;
  boxlist[cboxi].packy = by;
  boxlist[cboxi].packz = bz;
  printf(strx, strpackst, strdim1, strdim2, strdim3, strcox, strcoy, strcoz, strpackx, strpacky, strpackz);
  return;
}


//*******************************************************************
// USING THE PARAMETERS FOUND, PACKS THE BEST SOLUTION FOUND
// AND REPORS TO THE CONSOLE AND TO A TEXT FILE
//*******************************************************************

var report = function(){
	quit = 0;
	switch(bestvariant){
	    case 1:
	      px = xx; py = yy; pz = zz;
	      break;
	    case 2:
	      px = zz; py = yy; pz = xx;
	      break;
	    case 3:
	      px = zz; py = xx; pz = yy;
	      break;
	    case 4:
	      px=yy; py=xx; pz = zz;
	      break;
	    case 5:
	      px = xx; py = zz; pz = yy;
	      break;
	    case 6:
	      px = yy; py = zz; pz = xx;
	      break;
	}
	packingbest = 1;

	strpx = px;
	strpy = py;
	strpz = pz;

	percentagepackedbox = bestvolume * 100 / totalboxvol;
	percentageused = bestvolume * 100 / totalvolume;

	sc.innerHTML = "";
	printf("TOTAL NUMBER OF ITERATIONS DONE                       :", itenum);
	printf("BEST SOLUTION FOUND AT ITERATION                      :", bestite, "OF VARIANT", bestvariant);
	printf("TOTAL NUMBER OF BOXES                                 :", tbn);
	printf("PACKED NUMBER OF BOXES                                :", bestpackednum);
	printf("TOTAL VOLUME OF ALL BOXES                             :", totalboxvol);
	printf("PALLET VOLUME                                         :", totalvolume);
	printf("BEST SOLUTION'S VOLUME UTILIZATION                    :", bestvolume, "OUT OF", totalvolume);
	printf("PERCENTAGE OF PALLET VOLUME USED                      :", percentageused);
	printf("PERCENTAGE OF PACKED BOXES (VOLUME)                   :", percentagepackedbox);
	printf("WHILE PALLET ORIENTATION X - Y - Z                    :", px, py, pz);
	printf("---------------------------------------------------------------------------------------------\n");

	listcanditlayers();
	layers[0].layereval= -1;
	qsort(layers);
	packedvolume = 0.0;
	packedy = 0;
	packing = 1;

// layerthickness = layers[bestite].layerdim;
	remainpy = py;
	remainpz = pz;

	for (x = 1; x <= tbn; x++){
    	boxlist[x].packst = 0;
	}

	do {
	    layerinlayer = 0;
	    layerdone = 0;
	    packlayer();
	    packedy = packedy + layerthickness;
	    remainpy = py - packedy;

		if (layerinlayer) {
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

		if (!quit) {
    		findlayer(remainpy);
    	}
  	} while (packing && !quit);

	printf("\n\n *** LIST OF UNPACKED BOXES ***\n");
	unpacked = 1;

	for (cboxi = 1; cboxi <= tbn; cboxi++) {
    	if (!boxlist[cboxi].packst) {
    		graphunpackedout();
    	}
	}
	unpacked = 0;

	printf("\n");
	for (n = 1; n <= tbn; n++) {
    	if (boxlist[n].packst) {
    		printf(n, boxlist[n].dim1, boxlist[n].dim2, boxlist[n].dim3, boxlist[n].cox, boxlist[n].coy, boxlist[n].coz, boxlist[n].packx, boxlist[n].packy, boxlist[n].packz);
    	}
	}
	printf("TOTAL NUMBER OF ITERATIONS DONE    :", itenum);
	printf("BEST SOLUTION FOUND AT             : ITERATION: "+bestite+" OF VARIANT:", bestvariant);
	printf("TOTAL NUMBER OF BOXES              :", tbn);
	printf("PACKED NUMBER OF BOXES             :", bestpackednum);
	printf("TOTAL VOLUME OF ALL BOXES          :", totalboxvol);
	printf("PALLET VOLUME                      :",totalvolume);
	printf("BEST SOLUTION'S VOLUME UTILIZATION : "+bestvolume+" OUT OF", bestvolume, totalvolume);
	printf("PERCENTAGE OF PALLET VOLUME USED   :", percentageused);
	printf("PERCENTAGE OF PACKEDBOXES (VOLUME) :", percentagepackedbox);
	printf("WHILE PALLET ORIENTATION           : X="+px+"; Y="+py+"; Z="+pz);
}
