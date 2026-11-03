/* Request lifecycle for the demo; the standalone library API remains synchronous. */
(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.PackingRunner=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function create(options) {
    var active=null,sequence=0,background=!!options.createWorker;
    var defer=options.defer||setTimeout,clear=options.clear||clearTimeout;
    function mode() { if(options.onMode)options.onMode(background); }
    function state() { if(options.onState)options.onState({busy:!!active,background:background}); }
    function dispose(request) {
      if(request.worker) { request.worker.onmessage=null;request.worker.onerror=null;request.worker.onmessageerror=null;request.worker.terminate(); }
      if(request.timer!==undefined)clear(request.timer);
    }
    function finish(request,error,value) {
      if(active!==request)return;
      active=null;dispose(request);state();
      if(error)options.onError(error);else options.onResult(value);
    }
    function cancel() {
      if(!active)return false;
      var request=active;active=null;sequence++;dispose(request);state();return true;
    }
    function failWorker(request) {
      if(active!==request)return;
      background=false;mode();
      finish(request,'Background calculation failed. Calculate again to use local mode.');
    }
    function run(input) {
      cancel();
      var request={id:++sequence};active=request;
      if(background) {
        try { request.worker=options.createWorker(); }
        catch(error) { background=false;mode(); }
      }
      state();
      if(request.worker) {
        request.worker.onmessage=function(event) {
          if(active!==request||!event.data||event.data.id!==request.id)return;
          var data=event.data;
          if(data.ok===true&&data.result&&data.contact)finish(request,null,{result:data.result,contact:data.contact});
          else finish(request,typeof data.error==='string'?data.error:'Invalid background calculation response.');
        };
        request.worker.onerror=function(event) { if(event.preventDefault)event.preventDefault();failWorker(request); };
        request.worker.onmessageerror=function() { failWorker(request); };
        try { request.worker.postMessage({id:request.id,input:input}); }
        catch(error) { failWorker(request); }
      } else {
        // The file:// / unavailable-worker fallback is explicit and cannot be
        // interrupted once synchronous computation has begun on this page.
        request.timer=defer(function() {
          if(active!==request)return;
          try { finish(request,null,options.solve(input)); }
          catch(error) { finish(request,error.message||String(error)); }
        },0);
      }
      return request.id;
    }
    mode();state();
    return {run:run,cancel:cancel,isBusy:function(){return !!active;},usesBackground:function(){return background;}};
  }
  return {create:create};
});
