import assert from "node:assert/strict";
import {HemuBoot,ReadyWait} from "./WorkerHost.mjs";

for (const smp of [0,4]) {
  const h=await HemuBoot({smp,busProtocol:smp?1:0,rate:60});
  let seq=0;
  async function Exec(src)
  {
    const id="pointer-"+(++seq),done=h.Wait(m=>m.cmd==="fileResult" && m.id===id,30000);
    h.Post({cmd:"osExec",id,src,target:"adam"});
    const result=await done;
    assert.equal(result.ok,true,JSON.stringify(result));
  }
  try {
    assert.equal((await ReadyWait(h,20000)).ok,true);
    if (smp && !h.msgs.some(m=>m.cmd==="smpReady"))
      await h.Wait(m=>m.cmd==="smpReady",20000);
    await Exec(`
I64 pointer_cnt=0,pointer_code[8],pointer_x[8],pointer_y[8];
CTask *pointer_task=NULL;
U0 PointerTask()
{
  I64 msg,x,y;
  DocTermNew;WinHorz(0,79);WinVert(1,59);WinBorder(OFF);DocClear;
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  Fs->win_inhibit=WIG_USER_TASK_DFT|WIG_DBL_CLICK;
  WinFocus;WinZBufUpdate;
  while (TRUE) {
    msg=GetMsg(&x,&y,1<<MSG_MS_L_DOWN|1<<MSG_MS_L_UP|
          1<<MSG_MS_R_DOWN|1<<MSG_MS_R_UP);
    if (pointer_cnt<8) {
      pointer_code[pointer_cnt]=msg;
      pointer_x[pointer_cnt]=x+Fs->pix_left+Fs->scroll_x;
      pointer_y[pointer_cnt]=y+Fs->pix_top+Fs->scroll_y;
      pointer_cnt++;
    }
  }
}
pointer_task=Spawn(&PointerTask,NULL,"Pointer");
while (sys_focus_task!=pointer_task) Sleep(1);
`);
    h.Post({cmd:"__batch",messages:[
      {cmd:"input",x:280,y:200,b:1},
      {cmd:"input",x:282,y:202,b:0},
      {cmd:"input",x:380,y:300,b:2},
      {cmd:"input",x:382,y:302,b:0},
      {cmd:"input",x:500,y:350,b:0}
    ]});
    await Exec(`
F64 pointer_deadline=tS+3;
while (pointer_cnt<4 && tS<pointer_deadline) Sleep(1);
if (sys_focus_task!=pointer_task) throw('Focus');
if (pointer_cnt<4) throw('0'+pointer_cnt);
if (pointer_code[0]!=MSG_MS_L_DOWN || pointer_code[1]!=MSG_MS_L_UP ||
      pointer_code[2]!=MSG_MS_R_DOWN || pointer_code[3]!=MSG_MS_R_UP)
  throw('Order');
if (pointer_x[0]!=280 || pointer_x[1]!=282 ||
      pointer_x[2]!=380 || pointer_x[3]!=382)
  throw('PosX');
if (pointer_y[0]!=200 || pointer_y[1]!=202 ||
      pointer_y[2]!=300 || pointer_y[3]!=302)
  throw('PosY');
`);
    //Ctrl-drag makes WinMgr consume state without copying ms_last.
    h.Post({cmd:"input",x:320,y:240,b:0,keys:[0x1D]});
    await Exec("while (!winmgr.grab_scroll) Sleep(1);");
    h.Post({cmd:"__batch",messages:[
      {cmd:"input",x:320,y:240,b:1},
      {cmd:"input",x:328,y:248,b:0}
    ]});
    await Exec(`
I64 pointer_update=winmgr.updates+8;
while (winmgr.updates<pointer_update) Sleep(1);
if (ms.lb || ms.rb) throw('Held');
`);
    h.Post({cmd:"input",b:0,keys:[0x9D],reset:true});
    await Exec("while (winmgr.grab_scroll) Sleep(1);Kill(pointer_task);");
    assert.ok(!h.msgs.some(m=>m.cmd==="error"));
    assert.ok(!h.apMsgs.some(m=>m.cmd==="error"));
    console.log(`${smp||1} core: native task receives batched short clicks and original positions; native Ctrl-drag releases.`);
  } catch (error) {
    console.error(h.msgs.filter(m=>m.cmd==="fileResult"||m.cmd==="guestResult").slice(-12));
    throw error;
  } finally {await h.Stop();}
}
