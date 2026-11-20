//V5.03 Kernel/KMisc.HC's SndRst: a sound semaphore left set is cleared,
//and a clear one stays clear.

U0 SndRstChk()
{
  "%d\n",Bt(&sys_semas[SEMA_SND],0);
  SndRst;
  "%d\n",Bt(&sys_semas[SEMA_SND],0);
  LBts(&sys_semas[SEMA_SND],0);
  "%d\n",Bt(&sys_semas[SEMA_SND],0);
  SndRst;
  "%d\n",Bt(&sys_semas[SEMA_SND],0);
  Snd(60);
  SndRst;
  "%d\n",Bt(&sys_semas[SEMA_SND],0);
}

SndRstChk;
