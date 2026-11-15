self.onmessage=function ClockInit(event)
{
  let words=new BigInt64Array(event.data.buffer),
    offset=performance.timeOrigin-event.data.origin;
  function ClockTick()
  {
    Atomics.store(words,0,BigInt(Math.floor((performance.now()+offset)*1000000)));
    setTimeout(ClockTick,1);
  }
  ClockTick();
  self.postMessage("ready");
};
