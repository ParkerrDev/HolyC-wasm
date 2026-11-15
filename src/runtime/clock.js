export async function ClockStart()
{//Browser timers may be clamped or throttled; tS and deadlines use fresh time.
  let worker,words,timer,ready;
  if (typeof Worker=="undefined" || typeof SharedArrayBuffer=="undefined")
    return null;
  try {
    words=new BigInt64Array(new SharedArrayBuffer(8));
    Atomics.store(words,0,-1n);
    worker=new Worker(new URL("./clock-worker.js",import.meta.url),{type:"module"});
    ready=await new Promise(function ClockWait(resolve) {
      function ClockFail(event)
      {
        event?.preventDefault?.();
        Atomics.store(words,0,-1n);
        worker.terminate();
        resolve(false);
      }
      worker.onerror=ClockFail;
      worker.onmessageerror=ClockFail;
      worker.onmessage=function ClockReady(event) {resolve(event.data=="ready");};
      timer=setTimeout(ClockFail,1000);
      worker.postMessage({buffer:words.buffer,origin:performance.timeOrigin});
    });
    if (ready) return {worker,words};
  } catch {
    //A blocked/unavailable nested worker keeps the fresh host-clock fallback.
  } finally {
    clearTimeout(timer);
    if (!ready) worker?.terminate();
  }
  return null;
}
