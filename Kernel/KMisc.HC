//V5.03 Kernel/KMisc.HC. SleepUntil and Sleep are in RuntimeA.HC beside
//the host clock that keeps $LK,"cnts.jiffies",A="MN:CCntsGlbls"$.

U16 EndianU16(U16 d)
{//Swap big<-->little endian.
  I64 res=0;
  res.u8[1]=d.u8[0];
  res.u8[0]=d.u8[1];
  return res;
}

U32 EndianU32(U32 d)
{//Swap big<-->little endian.
  I64 res=0;
  res.u8[3]=d.u8[0];
  res.u8[2]=d.u8[1];
  res.u8[1]=d.u8[2];
  res.u8[0]=d.u8[3];
  return res;
}

I64 EndianI64(I64 d)
{//Swap big<-->little endian.
  U64 res;
  res.u8[7]=d.u8[0];
  res.u8[6]=d.u8[1];
  res.u8[5]=d.u8[2];
  res.u8[4]=d.u8[3];
  res.u8[3]=d.u8[4];
  res.u8[2]=d.u8[5];
  res.u8[1]=d.u8[6];
  res.u8[0]=d.u8[7];
  return res;
}

Bool Blink(F64 Hz=2.5)
{//Return TRUE, then FALSE, then TRUE at given frequency.
  if (!Hz) return 0;
  return ToI64(cnts.jiffies*2*Hz/JIFFY_FREQ)&1;
}

//V5.03 drives the PC speaker through PIT channel 2 and port 0x61, as
//$LK,"Snd",A="MN:Snd"$ does. The browser has no ports, so these keep those
//registers and give the host speaker the tone they make.
class CSndData
{//Fmt recorded in mem
  CSndData *next,*last;
  F64	tS;
  I8	ona;
};

public class CScrnCastGlbls
{
  CSndData snd_head;
  CDate	t0_now;
  F64	t0_tS;
  U8	*print_fmt;
  CDC	*dc,*dc2_alias;
  Bool	record,just_audio;
  I8	ona;
};

CScrnCastGlbls	scrncast; //V5.03 Kernel/KGlbls.HC. KernelA.HH has the classes.
U8  *(*fp_getstr2)(I64 flags=0); //Kernel/KGlbls.HC too.

Bool DbgMode(Bool val)
{//Set dbg-mode.
  return LBEqu(&sys_semas[SEMA_DBG_MODE],0,val);
}

Bool IsDbgMode()
{//Return dbg-mode.
  return Bt(&sys_semas[SEMA_DBG_MODE],0);
}

U0 ProgressBarsRst(U8 *path=NULL)
{//Reset all progress bars to zero.
  CallExtStr("ProgressBarsRegTf",path);
  MemSet(sys_progresses,0,sizeof(sys_progresses));
}

I64 pit2_period,pit2_lo,port_tone_period;
Bool pit2_hi;
U8 port_61;

U0 PortSpeakerUpdate()
{//The host hears a change of tone, not every port write.
  I64 period=0;
  if (port_61&3==3)
    period=pit2_period;
  if (period!=port_tone_period) {
    port_tone_period=period;
    if (period)
      __snd(ToF64(SYS_TIMER_FREQ)/period);
    else
      __snd(0);
  }
}

U0 OutU8(I64 port,I64 val)
{//Write U8 to port.
  switch (port) {
    case 0x42:
      if (pit2_hi) {
	pit2_period=pit2_lo+val.u8[0]<<8;
	PortSpeakerUpdate;
      } else
	pit2_lo=val.u8[0];
      pit2_hi=!pit2_hi;
      break;
    case 0x43:
      if (val>>6&3==2)
	pit2_hi=FALSE;
      break;
    case 0x61:
      port_61=val;
      PortSpeakerUpdate;
      break;
  }
}

U8 InU8(I64 port)
{//Read U8 from port.
  if (port==0x61)
    return port_61;
  return 0;
}

U0 SndRst()
{//Fix stuck sound.
  if (Bt(&sys_semas[SEMA_SND],0)) {
    Sleep(1);
    if (Bt(&sys_semas[SEMA_SND],0)) {
      Sleep(1);
      LBtr(&sys_semas[SEMA_SND],0);
    }
  }
  Snd;
}
