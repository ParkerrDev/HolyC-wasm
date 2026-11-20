//Kernel/KStart32.HC's SYS_PROGRESSES labels, KernelB.HH's names for them and
//KMisc.HC ProgressBarsRst.

U0 ProgressBarsChk()
{
  I64 i;
  U8 *base=sys_progresses;
  "%d %d\n",sizeof(CProgress),sizeof(sys_progresses);
  "%d %d %d %d %d\n",&progress1-base,&progress1_max-base,
	&progress1_t0-base,&progress1_tf-base,progress1_desc-base;
  "%d %d %d\n",&progress2-base,&progress3_max-base,progress4_desc-base;
  progress2=7;
  progress4_max=9;
  progress1_t0=1.5;
  StrCpy(progress3_desc,"Hi");
  "%d %d %5.3f %s\n",sys_progresses[1].val,sys_progresses[3].max,
	sys_progresses[0].t0,sys_progresses[2].desc;
  ProgressBarsRst;
  for (i=0;i<PROGRESS_BARS_NUM;i++)
    "%d %d %5.3f %5.3f %d\n",sys_progresses[i].val,sys_progresses[i].max,
	  sys_progresses[i].t0,sys_progresses[i].tf,*sys_progresses[i].desc;
}

ProgressBarsChk;
