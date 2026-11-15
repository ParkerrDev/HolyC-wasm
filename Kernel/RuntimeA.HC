
CTask fs_storage;
CTask *Fs;
CTask *sys_winmgr_task;
CTask *sys_focus_task;
CKbdStateGlbls kbd;

//==================== gr global ====================
#define GR_PEN_BRUSHES_NUM 64
#define COLOR_INVALID 16
class CGr {
  CDC *dc,*dc2;
  U8 *win_uncovered_bitmap;
  I64 highest_uncovered;
  U64 to_8_bits[256],to_8_colors[256];
  U16 *win_z_buf;
  CDC *pen_brushes[GR_PEN_BRUSHES_NUM],
      *collision_pen_brushes[GR_PEN_BRUSHES_NUM],
      *even_pen_brushes[GR_PEN_BRUSHES_NUM],
      *odd_pen_brushes[GR_PEN_BRUSHES_NUM];
  I8 circle_lo[GR_PEN_BRUSHES_NUM][GR_PEN_BRUSHES_NUM],
     circle_hi[GR_PEN_BRUSHES_NUM][GR_PEN_BRUSHES_NUM];
};
CGr gr;
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

I64 ClampI64(I64 x,I64 lo,I64 hi)
{
  if (x<lo) return lo; if (x>hi) return hi; return x;
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

public F64 Saw(F64 t,F64 period)
{//Sawtooth in [0,1], as in Adam/Snd/SndMath.HC.
  if (period) {
    if (t>=0.0)
      return t%period/period;
    return 1.0+t%period/period;
  }
  return 0.0;
}

public F64 FullSaw(F64 t,F64 period)
{//Signed sawtooth.
  if (period) {
    if (t>=0.0)
      return 2.0*(t%period/period)-1.0;
    return 2.0*(t%period/period)+1.0;
  }
  return 0.0;
}

//==================== time / scheduling ====================
F64 tS() { return __time_ms()/1000.0; }
U0 Sleep(I64 ms) { __sleep(ms); }
U0 Yield() { __yield(); }
I64 GetTSC()
{
  I64 res=__tsc;
  if (res<0)
    res=__time_ms()*1000000.0;
  return res;
}

//==================== input ====================
I64 ScanChar() { return __scan_char(); }
I64 KeyGet() { return __get_char(0,0); }

U0 MsSet(I64 x=I64_MAX,I64 y=I64_MAX,I64 z=I64_MAX,
	I64 l=I64_MAX,I64 r=I64_MAX)
{//The browser supplies unscaled screen coordinates and device state.
  if (0<=x<GR_WIDTH) ms.pos.x=x;
  if (0<=y<GR_HEIGHT) ms.pos.y=y;
  if (z!=I64_MAX) ms.pos.z=z;
  if (FALSE<=l<=TRUE) ms.lb=l;
  if (FALSE<=r<=TRUE) ms.rb=r;
  LBEqu(&kbd.scan_code,SCf_MS_L_DOWN,ms.lb);
  LBEqu(&kbd.scan_code,SCf_MS_R_DOWN,ms.rb);
  __ms_set(ms.pos.x,ms.pos.y,ms.pos.z,ms.lb,ms.rb);
}

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
