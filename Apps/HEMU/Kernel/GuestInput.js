const Clamp=(n,max)=>Math.max(0,Math.min(max,Math.round(n)));

export function createGuestInput({guest,onState=()=>{}})
{
  let x=320,y=240,b=0,wheel=0,dx=0,dy=0,relative=false,reset=true,
      frameX=320,frameY=240,frameB=0,frameWheel=0,edges=[],lastHint='';
  function accept(m)
  {
    let next=(m.b|0)&3;
    if (Number.isFinite(m.x)) x=Clamp(m.x,639);
    if (Number.isFinite(m.y)) y=Clamp(m.y,479);
    if (Number.isFinite(m.wheel)) wheel=m.wheel|0;
    if (typeof m.relative==='boolean' && relative!==m.relative) {
      relative=m.relative;dx=dy=0;reset=true;
    }
    if (m.reset) {
      edges=[];b=frameB=0;reset=true;dx=dy=0;
    } else {
      if (relative) {
        dx+=Number.isFinite(m.dx)?m.dx:0;
        dy+=Number.isFinite(m.dy)?m.dy:0;
      }
      if (next!==b) {
        b=next;
        edges.push({x,y,b,wheel,dx,dy,relative,reset,updates:null});
        dx=dy=0;reset=false;
      }
    }
  }
  function beforeFrame()
  {
    let state=guest()?.inputState(),edge=edges[0],move,hint,key;
    //WinMgrSleep samples before its native controls run. One full guest
    //poll/handler cycle, including menu/scroll loops, must finish per edge.
    if (edge && edge.updates!==null &&
        state?.updates>=edge.updates+2) {
      edges.shift();edge=edges[0];
    }
    move=edge||{x,y,b,wheel,dx,dy,relative,reset};
    if (edge && edge.updates===null && Number.isFinite(state?.updates))
      edge.updates=state.updates;
    if (move.relative) {
      frameX=Clamp((state?.x??(move.reset?320:frameX))+move.dx,639);
      frameY=Clamp((state?.y??(move.reset?240:frameY))+move.dy,479);
    } else {
      frameX=move.x;frameY=move.y;
    }
    frameB=move.b;frameWheel=move.wheel;
    if (edge) {
      edge.dx=edge.dy=0;edge.reset=false;
    } else {
      dx=dy=0;reset=false;
    }
    hint=state?{capture:state.capture,game:state.game}:{capture:false,game:false};
    key=JSON.stringify(hint);
    if (key!==lastHint) {lastHint=key;onState(hint);}
  }
  function save()
  {
    return {x,y,b,wheel,dx,dy,relative,reset,frameX,frameY,frameB,frameWheel,
      edges:edges.map(edge=>({...edge}))};
  }
  function restore(p)
  {
    ({x,y,b,wheel,dx,dy,relative,reset,frameX,frameY}=p);
    frameB=p.frameB??b;frameWheel=p.frameWheel??wheel;
    edges=(p.edges||[]).map(edge=>({...edge}));lastHint='';
  }
  return {accept,beforeFrame,save,restore,afterFrame:()=>{},
    x:()=>BigInt(frameX),y:()=>BigInt(frameY),buttons:()=>BigInt(frameB),
    wheel:()=>BigInt(frameWheel)};
}
