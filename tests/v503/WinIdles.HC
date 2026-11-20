U0 WinIdles()
{
  CWinMgrTimingGlbls sample,*old=winmgr.t;
  CCPU *c=cpu_structs;
  F64 saved=c->idle_factor;
  I64 pct;
  MemSet(&sample,0,sizeof(CWinMgrTimingGlbls));
  PUSHFD
  CLI
  winmgr.t=&sample;
  sample.last_calc_idle_time=tS-1;
  sample.last_total_jiffies=c->total_jiffies-100;
  sample.last_idle_pt_hits[0]=c->idle_pt_hits-25;
  WinCalcIdles;
  pct=100*c->idle_factor;
  winmgr.t=old;
  c->idle_factor=saved;
  POPFD
  "%d %d\n",sample.calc_idle_cnt,pct;
}

WinIdles;
