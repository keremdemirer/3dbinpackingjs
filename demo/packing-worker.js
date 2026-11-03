/* Same-origin classic worker; paths are relative to this file, including on Pages. */
'use strict';
importScripts('../pack.js','support.js');
self.onmessage=function(event) {
  var request=event.data;
  try {
    var result=BinPacking.pack(request.input);
    var contact=PackingSupport.analyze(result);
    self.postMessage({id:request.id,ok:true,result:result,contact:contact});
  } catch(error) {
    self.postMessage({id:request.id,ok:false,error:error.message||String(error)});
  }
};
