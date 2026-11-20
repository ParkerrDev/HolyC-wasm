
CTask fs_storage;
CTask *Fs;
CTask *adam_task;
CCPU boot_cpu; //V5.03 keeps it in $LK,"CSysFixedArea",A="MN:CSysFixedArea"$.
CCPU *cpu_structs=&boot_cpu; //$LK,"Gs",A="MN:Gs"$ points to cur $LK,"CCPU",A="MN:CCPU"$.
I64 mp_cnt=1; //Count of cores
U8 *mem_mapped_space=8192*0x10000; //Top of WASM memory, abi.js MEM_MAX_PAGES.
CSema sys_semas[SEMA_SEMAS_NUM];
CTask *sys_winmgr_task,*sys_task_being_scrn_updated;
CTask *sys_focus_task;
CJob sys_macro_head; //V5.03 Kernel/KGlbls.HC.
CTask *sys_macro_task;
CDoc *sys_clip_doc;
CDoc *(*fp_doc_put)(CTask *task=NULL);
U0 MacroHostInit()
{//V5.03 Kernel/KMain.HC:10 at boot; a runtime initializer here (src/prelude.js).
  QueInit(&sys_macro_head);
}
U8 *rev_bits_table, //Table with U8 bits revd
   *set_bits_table; //Table with count of set bits in a U8
U0 BitsTablesHostInit()
{//V5.03 Kernel/KEnd.HC:28 at boot; a runtime initializer here (src/prelude.js).
  I64 i,j;
  rev_bits_table=CAlloc(256);
  set_bits_table=CAlloc(256);
  for (i=0;i<256;i++)
    for (j=0;j<8;j++) {
      if (Bt(&i,7-j))	LBts(rev_bits_table+i,j);
      if (Bt(&i,j))	set_bits_table[i]++;
    }
}
CGridGlbls ms_grid; //See $LK,"::/Demo/Graphics/Grid.HC"$.
CMsStateGlbls ms,ms_last;
CKbdStateGlbls kbd;
CMsHardStateGlbls ms_hard,ms_hard_last;
CAutoCompleteDictGlbls acd;
CAutoCompleteGlbls ac;
U32 sys_run_level; //V5.03 keeps it in $LK,"CKernel",A="MN:CKernel"$.
CProgress sys_progresses[PROGRESS_BARS_NUM]; //All progress bars.
//V5.03 KStart32.HC labels each field of sys_progresses, and KernelB.HH names
//the labels. src/prelude.js RUNTIME_ADDRESSES puts each name at its label.
I64 progress1; //Current progress 1.
U8 progress1_desc[PROGRESS_DESC_LEN]; //Progress 1 desc.
I64 progress1_max; //Progress 1 max.
F64 progress1_t0; //Progress 1 start time.
F64 progress1_tf; //Progress 1 end time.
I64 progress2; //Current progress 2.
U8 progress2_desc[PROGRESS_DESC_LEN]; //Progress 2 desc.
I64 progress2_max; //Progress 2 max.
F64 progress2_t0; //Progress 2 start time.
F64 progress2_tf; //Progress 2 end time.
I64 progress3; //Current progress 3.
U8 progress3_desc[PROGRESS_DESC_LEN]; //Progress 3 desc.
I64 progress3_max; //Progress 3 max.
F64 progress3_t0; //Progress 3 start time.
F64 progress3_tf; //Progress 3 end time.
I64 progress4; //Current progress 4.
U8 progress4_desc[PROGRESS_DESC_LEN]; //Progress 4 desc.
I64 progress4_max; //Progress 4 max.
F64 progress4_t0; //Progress 4 start time.
F64 progress4_tf; //Progress 4 end time.

//==================== gr global ====================
#define COLOR_INVALID 16
//V5.03 Adam/Gr/GrGlbls.HC.
public class CGrGlbls
{
  I64	*to_8_bits,*to_8_colors;
  CDC	*scrn_image,	//Read only.
	*dc,		//Persistent
	*dc1,
	*dc2,		//Updated every refresh
	*dc_cache,
	*zoomed_dc;
  U32	*text_base;	//See $LK,"TextBase Layer",A="HI:TextBase Layer"$. (Similar to 0xB8000 but 32 bits)
  U16	*win_z_buf;

  #define SPHT_ELEM_CODE	1
  CHashTable *sprite_hash;

  U16	*win_uncovered_bitmap;
  I64	highest_uncovered;
  U16	*vga_text_cache;
  I64	pan_text_x,pan_text_y;	//[-7,7]
  U0	(*fp_final_scrn_update)(CDC *dc);//Mouse cursor is handled here.
  U0	(*fp_wall_paper)(CTask *task);
  U0	(*fp_draw_ms)(CDC *dc,I64 x,I64 y);
  U0	(*fp_draw_grab_ms)(CDC *dc,I64 x,I64 y,Bool closed);
  U8	*empty_sprite; //Gets assigned $LK,"gr.empty_sprite",A="FF:::/Adam/AMouse.HC,empty_sprite"$

  #define GR_PEN_BRUSHES_NUM 64
  CDC	*pen_brushes[GR_PEN_BRUSHES_NUM],
	*collision_pen_brushes[GR_PEN_BRUSHES_NUM],
	*even_pen_brushes[GR_PEN_BRUSHES_NUM],
	*odd_pen_brushes[GR_PEN_BRUSHES_NUM];
  I8	circle_lo[GR_PEN_BRUSHES_NUM][GR_PEN_BRUSHES_NUM],
	circle_hi[GR_PEN_BRUSHES_NUM][GR_PEN_BRUSHES_NUM];

  #define GR_SCRN_ZOOM_MAX	8
  U8	*scrn_zoom_tables[GR_SCRN_ZOOM_MAX+1];
  I64	scrn_zoom,sx,sy;

  //When zoomed, this keeps the mouse centered.
  Bool	continuous_scroll,
	hide_row,hide_col;
} gr;

//V5.03 Kernel/KernelA.HH and KGlbls.HC. Raw.HC and the TextBase Layer use it.
#define RWF_IN_DOLLAR 1
#define RWF_LAST_DOLLAR 2
#define RWF_SHOW_DOLLAR 4
#define RWF_SCROLL 8

public class CTextGlbls
{
  I64 raw_col,raw_flags;
  U8 *raw_scrn_image;
  I64 rows,cols;
  U64 *font,*aux_font;
  U8 *vga_alias,*vga_text_alias;
  U8 border_chars[16];
} text;
U64 *__gr_font;
U8 __sys_font_std[2048]={/*SYS_FONT_STD*/};
I64 sys_font_std;

//==================== math (host-backed) ====================
I64 ToI64(F64 d)
{//Convert and truncate toward zero.
  I64 res=d;
  return res;
}

F64 ToF64(I64 i)
{//Convert the signed integer value.
  F64 res=i;
  return res;
}

F64 Sin(F64 x)
{
  return __sin(x);
}

F64 Cos(F64 x)
{
  return __cos(x);
}

F64 Tan(F64 x)
{
  return __tan(x);
}

F64 ASin(F64 x)
{
  return __asin(x);
}

F64 ACos(F64 x)
{
  return __acos(x);
}

F64 ATan(F64 x)
{
  return __atan(x);
}

F64 ATan2(F64 y,F64 x)
{
  return __atan2(y,x);
}

F64 Pow(F64 x,F64 y)
{
  return __pow(x,y);
}

F64 Exp(F64 x)
{
  return __exp(x);
}

F64 Ln(F64 x)
{
  return __log(x);
}

F64 Log(F64 x)
{
  return __log(x);
}

F64 Log10(F64 x)
{
  return __log10(x);
}

F64 Log2(F64 x)
{
  return __log(x)/loge_2;
}

F64 Sqrt(F64 x)
{
  return __sqrt(x);
}


F64 Abs(F64 x)
{
  return __abs(x);
}

I64 AbsI64(I64 x)
{
  if (x<0) return -x; return x;
}

I64 SignI64(I64 x)
{
  if (x>0) return 1; if (x<0) return -1; return 0;
}

F64 Sign(F64 x)
{
  if (x>0.0) return 1.0; if (x<0.0) return -1.0; return 0.0;
}

I64 ClampI64(I64 num,I64 lo,I64 hi)
{//Clamp to I64 [] range. V5.03 KUtils.HC _CLAMP_I64: hi wins over lo.
  if (num<lo) num=lo;
  if (num>hi) num=hi;
  return num;
}

U64 ClampU64(U64 num,U64 lo,U64 hi)
{//Clamp to U64 [] range. V5.03 KUtils.HC _CLAMP_U64.
  if (num<lo) num=lo;
  if (num>hi) num=hi;
  return num;
}

F64 Clamp(F64 x,F64 lo,F64 hi)
{
  if (x<lo) return lo; if (x>hi) return hi; return x;
}

I64 MinI64(I64 a,I64 b)
{
  if (a<b) return a; return b;
}

I64 MaxI64(I64 a,I64 b)
{
  if (a>b) return a; return b;
}

F64 Min(F64 a,F64 b)
{
  if (a<b) return a; return b;
}

F64 Max(F64 a,F64 b)
{
  if (a>b) return a; return b;
}

F64 Ceil(F64 x)
{
  return __ceil(x);
}

F64 Floor(F64 x)
{
  return __floor(x);
}

F64 Round(F64 x)
{
  return __round(x);
}

F64 Trunc(F64 x)
{
  return __trunc(x);
}

public U0 R2P(F64 *_mag=NULL,F64 *_arg=NULL,F64 x,F64 y)
{//Rect to polar
//Returns angle in range (-π,π]
  if (_arg)
    *_arg=Arg(x,y);
  if (_mag)
    *_mag=Sqrt(x*x+y*y);
}

public U0 P2R(F64 *_x=NULL,F64 *_y=NULL,F64 mag,F64 arg)
{//Polar to Rect
  if (_x)
    *_x=mag*Cos(arg);
  if (_y)
    *_y=mag*Sin(arg);
}

F64 Arg(F64 x,F64 y)
{
  return __atan2(y,x);
}


public Bool ToBool(I64 i)
{//Convert an integer to zero or one.
  return i!=0;
}

public F64 Sqr(F64 d)
{//Square of F64.
  return d*d;
}

public I64 SqrI64(I64 i)
{//Square of I64.
  return i*i;
}

public I64 Bsf(I64 bit_field_val)
{//First set bit from the low end; -1 for zero.
  if (!bit_field_val)
    return -1;
  return __ctz(bit_field_val);
}

public I64 Bsr(I64 bit_field_val)
{//First set bit from the high end; -1 for zero.
  if (!bit_field_val)
    return -1;
  return 63-__clz(bit_field_val);
}

public Bool Bt(U8 *bit_field,I64 bit)
{//Test a bit in memory.
  return ToBool(bit_field[bit>>3]&1<<(bit&7));
}

public Bool Bts(U8 *bit_field,I64 bit)
{//Test and set a bit in memory.
  I64 mask=1<<(bit&7);
  Bool res;
  bit_field+=bit>>3;
  res=ToBool(*bit_field&mask);
  *bit_field|=mask;
  return res;
}

public Bool Btr(U8 *bit_field,I64 bit)
{//Test and clear a bit in memory.
  I64 mask=1<<(bit&7);
  Bool res;
  bit_field+=bit>>3;
  res=ToBool(*bit_field&mask);
  *bit_field&=~mask;
  return res;
}

public Bool Btc(U8 *bit_field,I64 bit)
{//Test and complement a bit in memory.
  I64 mask=1<<(bit&7);
  Bool res;
  bit_field+=bit>>3;
  res=ToBool(*bit_field&mask);
  *bit_field^=mask;
  return res;
}

public Bool BEqu(U8 *bit_field,I64 bit,Bool val)
{//Set a bit to val, returning its previous value.
  if (val)
    return Bts(bit_field,bit);
  return Btr(bit_field,bit);
}

public Bool LBts(U8 *bit_field,I64 bit)
{//Atomic test and set.
  I64 mask=1<<(bit&7);
  return ToBool(__a_or8(bit_field+bit>>3,mask)&mask);
}

public Bool LBtr(U8 *bit_field,I64 bit)
{//Atomic test and clear.
  I64 mask=1<<(bit&7);
  return ToBool(__a_and8(bit_field+bit>>3,~mask)&mask);
}

public Bool LBtc(U8 *bit_field,I64 bit)
{//Atomic test and complement.
  I64 mask=1<<(bit&7);
  return ToBool(__a_xor8(bit_field+bit>>3,mask)&mask);
}

public Bool LBEqu(U8 *bit_field,I64 bit,Bool val)
{//Atomic assignment of one bit, returning its previous value.
  if (val)
    return LBts(bit_field,bit);
  return LBtr(bit_field,bit);
}

public U64 FloorU64(U64 num,U64 to)
{//Int multiples of num.
  return num-num%to;
}

public U64 CeilU64(U64 num,U64 to)
{//Int multiples of num.
  num+=to-1;
  return num-num%to;
}

public I64 RoundI64(I64 num,I64 to)
{//Int multiples of num.
  return num-num%to;
}

public I64 FloorI64(I64 num,I64 to)
{//Int multiples of num.
  if (num>=0)
    return num-num%to;
  num++;
  return num-num%to-to;
}

public I64 CeilI64(I64 num,I64 to)
{//Int multiples of num.
  if (num>=0) {
    num+=to-1;
    return num-num%to;
  }
  num+=to-1;
  return num-num%to-to;
}

#define LIN_CONGRUE_A 6364136223846793005
#define LIN_CONGRUE_C 1442695040888963407

public U64 RandU64()
{//V5.03 Kernel/KMathB.HC recurrence, with per-task state.
  I64 res=Fs->rand_seed;
  res=LIN_CONGRUE_A*res^(res&0xFFFFFFFF0000)>>16+LIN_CONGRUE_C;
  if (!Bt(&Fs->task_flags,TASKf_NONTIMER_RAND))
    res^=GetTSC;
  Fs->rand_seed=res;
  return res;
}

public I64 RandI64()
{//Random I64.
  return RandU64;
}

public U32 RandU32()
{//Random U32.
  I64 res=RandU64;
  return res.u32[0];
}

public I32 RandI32()
{//Random I32.
  I64 res=RandU64;
  return res.i32[0];
}

public U16 RandU16()
{//Random U16.
  I64 res=RandU64;
  return res.u16[0];
}

public I16 RandI16()
{//Random I16.
  I64 res=RandU64;
  return res.i16[0];
}

public F64 Rand()
{//Random F64 in [0,1).
  I64 res=RandU64;
  return (res&0x3FFFFFFFFFFFFFFF)/ToF64(0x4000000000000000);
}

public I64 Seed(I64 seed=0,CTask *task=NULL)
{//Set the task's seed; zero enables timer mixing.
  if (!task)
    task=Fs;
  if (seed) {
    Bts(&task->task_flags,TASKf_NONTIMER_RAND);
    return task->rand_seed=seed;
  }
  Btr(&task->task_flags,TASKf_NONTIMER_RAND);
  return task->rand_seed^=GetTSC;
}

//==================== time / scheduling ====================
CCntsGlbls	cnts={1,0,2676302000,2676302,2676302000,0,0,0,FALSE};

U0 CntsUpdate()
{//V5.03's timer IRQ counts jiffies and calls profiler_timer_irq on each.
//Here a task runs until it gives up the CPU, so the jiffies that went by
//are counted, and their IRQs called, when it is back.
  I64 i,jiffies=__time_ms*JIFFY_FREQ/1000;
  CCPU *c=cpu_structs;
  if (LBts(&sys_semas[SEMA_SYS_TIMER],0))
    return;
  if (c->profiler_timer_irq) {
    i=ClampI64(jiffies-cnts.jiffies,0,JIFFY_FREQ);
    while (i--) {
      cnts.jiffies++;
      cnts.timer+=SYS_TIMER0_PERIOD+1;
      (*c->profiler_timer_irq)(Fs);
    }
  }
  cnts.jiffies=jiffies;
  cnts.timer=jiffies*(SYS_TIMER0_PERIOD+1);
  LBtr(&sys_semas[SEMA_SYS_TIMER],0);
}

F64 tS() { return __time_ms()/1000.0; }

U0 Yield()
{//Give the CPU to the next task.
  __yield;
  CntsUpdate;
}

U0 SleepUntil(I64 wake_jiffy)
{//Not for power-saving.  It is to make a program pause without hogging the CPU.
//A profiler_timer_irq needs the CPU back each jiffy.
  Bool old_idle=LBts(&Fs->task_flags,TASKf_IDLE);
  CntsUpdate;
  if (wake_jiffy<=cnts.jiffies)
    __yield;
  else if (!cpu_structs->profiler_timer_irq)
    __sleep((wake_jiffy-cnts.jiffies)*1000/JIFFY_FREQ);
  else
    while (wake_jiffy>cnts.jiffies) {
      __sleep(1000/JIFFY_FREQ);
      CntsUpdate;
    }
  CntsUpdate;
  LBEqu(&Fs->task_flags,TASKf_IDLE,old_idle);
}

U0 Sleep(I64 mS)
{//Not for power-saving.  It is to make a program pause without hogging the CPU.
  if (!mS)
    Yield;
  else {
    CntsUpdate;
    SleepUntil(cnts.jiffies+mS*JIFFY_FREQ/1000);
  }
}

I64 GetTSC()
{
  I64 res=__tsc;
  if (res<0)
    res=__time_ms()*1000000.0;
  return res;
}

//V5.03 Adam/Win.HC's old_ms. It is here, before the prelude's first
//statement, so its GetTSC runs only in a program that uses old_ms.
CMsStateGlbls old_ms={{-1000,-1000,0},{-1000,-1000,0},{-1000,-1000,0},
  {0,0,0},{1.0,1.0,1.0},0.0,GetTSC,0.350,0,0,
  FALSE,FALSE,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE
};

//==================== console ====================
Bool Silent(Bool val=ON)
{//Turn off console output and return its previous state.
  return LBEqu(&Fs->display_flags,DISPLAYf_SILENT,val);
}

Bool IsSilent()
{
  return Bt(&Fs->display_flags,DISPLAYf_SILENT);
}

U0 Putc(I64 ch) { PutKey(ch); }

U0 PutChars(U64 ch)
{//Output up to eight packed characters.
  while (ch) {
    PutKey(ch&255,0);
    ch>>=8;
  }
}
