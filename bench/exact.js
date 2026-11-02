'use strict';
// Exhaustive integer-grid oracle for tiny instances only; independent of the heuristic.
function exactGrid(input, { maxStates=100000 }={}) {
  const {width:w,height:h,depth:d}=input.container;
  const cells=w*h*d;
  if (![w,h,d].every(n=>Number.isSafeInteger(n)&&n>0) || cells>27) throw new RangeError('Oracle supports positive integer containers up to 27 cells.');
  if (!Number.isSafeInteger(maxStates) || maxStates<1) throw new RangeError('maxStates must be positive.');
  const count=input.items.reduce((sum,item)=>{
    const quantity=item.quantity??1;
    if(!Number.isSafeInteger(quantity)||quantity<1)throw new RangeError('Oracle quantities must be positive integers.');
    return sum+quantity;
  },0);
  if (count>8) throw new RangeError('Oracle supports at most 8 instances.');
  const boxes=input.items.flatMap(item=>Array.from({length:item.quantity??1},()=>item));
  for (const item of boxes) {
    if (![item.width,item.height,item.depth].every(n=>Number.isSafeInteger(n)&&n>0)) throw new RangeError('Oracle dimensions must be positive integers.');
    if (!['free','upright','fixed'].includes(item.rotation??'free')) throw new TypeError('Invalid oracle rotation.');
  }
  boxes.sort((a,b)=>b.width*b.height*b.depth-a.width*a.height*a.depth);
  const choices=boxes.map(item=>{
    const a=item.width,b=item.height,c=item.depth;
    const sizes=item.rotation==='fixed'?[[a,b,c]]:item.rotation==='upright'?[[a,b,c],[c,b,a]]:
      [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
    const masks=new Set();
    for (const [xSize,ySize,zSize] of sizes) {
      for(let x=0;x+xSize<=w;x++) for(let y=0;y+ySize<=h;y++) for(let z=0;z+zSize<=d;z++) {
        let mask=0n;
        for(let i=x;i<x+xSize;i++) for(let j=y;j<y+ySize;j++) for(let k=z;k<z+zSize;k++) mask|=1n<<BigInt(i+w*(j+h*k));
        masks.add(mask);
      }
    }
    return {volume:a*b*c,masks:[...masks]};
  });
  const remaining=new Array(boxes.length+1).fill(0);
  for(let i=boxes.length-1;i>=0;i--) remaining[i]=remaining[i+1]+choices[i].volume;
  const memo=new Map(); let states=0;
  function search(index,occupied,used) {
    if(index===choices.length) return 0;
    const key=`${index}:${occupied}`;
    if(memo.has(key)) return memo.get(key);
    if(++states>maxStates) throw new Error('STATE_BUDGET');
    const choice=choices[index],upper=Math.min(remaining[index],cells-used);
    let best=0;
    for(const mask of choice.masks) {
      if((mask&occupied)!==0n) continue;
      best=Math.max(best,choice.volume+search(index+1,occupied|mask,used+choice.volume));
      if(best===upper) { memo.set(key,best); return best; }
    }
    best=Math.max(best,search(index+1,occupied,used)); // Leaving this item unpacked is allowed.
    memo.set(key,best); return best;
  }
  try { return {complete:true,volume:search(0,0n,0),states}; }
  catch(error) { if(error.message==='STATE_BUDGET') return {complete:false,volume:null,states,reason:'state-budget'}; throw error; }
}
module.exports={exactGrid};
