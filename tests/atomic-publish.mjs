import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {compileHolyC} from '../src/compiler.js';

if(!isMainThread) {
  const instance=new WebAssembly.Instance(workerData.module,{env:{mem:workerData.memory}});
  parentPort.postMessage(instance.exports[workerData.entry]());
} else {
  const result=compileHolyC(`
U64 value[2],ready=0,ack=0;
I64 Producer() {
  I64 i;
  for(i=1;i<=5000;i++) {
    while(__a_load64(&ack)!=i-1) {}
    value[0]=i*0xFEDCBA987;
    value[1]=~value[0];
    __a_store64(&ready,i);
  }
  return 5000;
}
I64 Consumer() {
  I64 i,errors=0;
  for(i=1;i<=5000;i++) {
    while(__a_load64(&ready)!=i) {}
    if(value[0]!=i*0xFEDCBA987 || value[1]!=~value[0]) errors++;
    __a_store64(&ack,i);
  }
  return errors;
}
`,{lenient:false,noPrelude:true,sharedMemory:true,exports:['Producer','Consumer']});
  assert.deepEqual(result.warnings,[]);
  const module=new WebAssembly.Module(result.bytes);
  assert.deepEqual(WebAssembly.Module.imports(module),[{module:'env',name:'mem',kind:'memory'}]);
  const memory=new WebAssembly.Memory({initial:512,maximum:8192,shared:true});
  new WebAssembly.Instance(module,{env:{mem:memory}}).exports.__rt_init();
  const workers=['Producer','Consumer'].map(entry=>new Worker(new URL(import.meta.url),{workerData:{module,memory,entry}}));
  const timer=setTimeout(()=>{for(const worker of workers)worker.terminate();},10000);
  try {
    const outputs=await Promise.all(workers.map(worker=>new Promise((resolve,reject)=>{
      worker.once('message',resolve);worker.once('error',reject);
      worker.once('exit',code=>{if(code)reject(new Error('Atomic publication worker exited '+code));});
    })));
    assert.deepEqual(outputs,[5000n,0n]);
    console.log('Atomic publication: 5,000 payload handshakes across two actual WASM workers pass without read-modify-write polling.');
  } finally {clearTimeout(timer);await Promise.all(workers.map(worker=>worker.terminate()));}
}
