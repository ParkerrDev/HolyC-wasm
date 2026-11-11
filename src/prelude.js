// prelude.js - the HolyC standard-library prelude, compiled together with every
// user program. It is real HolyC: classes, #defines, and functions layered over
// the small set of host intrinsics declared in abi.js (the __xxx imports).
//
// This mirrors how TempleOS builds most of Gr*/math/etc. in HolyC on top of a
// few primitives, and it exercises the compiler on real HolyC code.
import {GR_PRIMITIVES_SRC} from "./gr-primitives.js";
import {GR_PALETTE_SRC} from "./gr-palette.js";
import {GR_MATH_SRC} from "./gr-math.js";
import {GR_TYPES_SRC,GR_SRC} from "./gr-prelude.js";
import {HASH_TYPES_SRC,HASH_SRC} from "./hash-prelude.js";
import {CMP_TYPES_SRC,CMP_SRC} from "./cmp-control.js";
import {DEFINE_SRC} from "./define-prelude.js";
import {TASK_TYPES_SRC,TASK_SRC} from "./task-prelude.js";
import {TASK_MESSAGE_SRC} from "./task-message.js";
import {DIR_TYPES_SRC,DIR_SRC} from "./dir-prelude.js";
import {FILE_SRC} from "./file-prelude.js";
import {TASK_INTERFACE,TASK_SCHEDULE_SRC} from "./task-schedule.js";
import {DOC_TYPES_SRC,WINDOW_SRC} from "./window-prelude.js";
import {DOC_ENTRY_TYPES_SRC} from "./doc-entry.js";
import {FIFO_TYPES_SRC,FIFO_SRC} from "./fifo-prelude.js";
import {KBD_SRC} from "./kbd-prelude.js";
import {FONT} from "./runtime/font.js";
import {RAW_SRC} from "./raw-prelude.js";
import {CONSOLE_SRC} from "./console-prelude.js";
import {STR_SRC} from "./str-prelude.js";
import {GR_COMPOSITES_SRC} from "./gr-composites.js";
import {SPRITE_TYPES_SRC,SPRITE_SRC} from "./gr-sprite.js";

// Runtime initialization is a dependency of the globals it establishes. The
// compiler uses the same reachability graph for these hooks and ordinary calls.
export const RUNTIME_INITIALIZERS=[
  {name:"__hcrt_init",always:true},
  {name:"DirHostInit",globals:["blkdev","dir_host_ready","dir_host_nodes",
      "dir_host_node_cnt","dir_host_byte_cnt","dir_host_drvs","dir_host_bds"],
    fields:["CTask.cur_dir","CTask.cur_dv"],
    exports:["DirHostTaskInit","DirHostSeed","DirHostReady","DirHostNext",
      "DirHostName","DirHostData","DirHostSize","DirHostIsDir",
      "DirHostMaxPath","DirHostMaxBytes","DirHostMaxNodes","MAlloc","Free"]},
  {name:"HashHostInit",fields:["CTask.hash_table"],
    exports:["HashHostTaskInit"]},
  {name:"RawHostInit",globals:["text"]},
  {name:"KbdHostInit",globals:["kbd"]},
  {name:"__hgr_init",globals:["gr","__gr_font"]},
  {name:"__hgr_pen_init",fields:["gr.pen_brushes","gr.collision_pen_brushes",
    "gr.even_pen_brushes","gr.odd_pen_brushes","gr.circle_lo","gr.circle_hi"]},
];
export const RUNTIME_INTERFACES=[TASK_INTERFACE];
// Live V5.03 exports these storage addresses as untyped, nonassignable symbols.
export const RUNTIME_ADDRESSES=[
  {name:"sys_font_std",storage:"__sys_font_std"},
  {name:"sys_font_cyrillic",storage:"__sys_font_cyrillic"},
];

export function Prelude(outputSrc=CONSOLE_SRC,docEntrySrc="") {return String.raw`
//==================== constants ====================
#define NULL 0
#define TRUE 1
#define FALSE 0
#define ON 1
#define OFF 0
#define GR_WIDTH 640
#define GR_HEIGHT 480
#define FONT_WIDTH 8
#define FONT_HEIGHT 8
#define TEXT_ROWS (GR_HEIGHT/FONT_HEIGHT)
#define TEXT_COLS (GR_WIDTH/FONT_WIDTH)
#define COLORS_NUM 16
#define STR_LEN 144

#define BLACK 0
#define BLUE 1
#define GREEN 2
#define CYAN 3
#define RED 4
#define PURPLE 5
#define BROWN 6
#define LTGRAY 7
#define DKGRAY 8
#define LTBLUE 9
#define LTGREEN 10
#define LTCYAN 11
#define LTRED 12
#define LTPURPLE 13
#define YELLOW 14
#define WHITE 15

#define I8_MIN (-0x80)
#define I8_MAX 0x7F
#define I16_MIN (-0x8000)
#define I16_MAX 0x7FFF
#define I32_MIN (-0x80000000)
#define I32_MAX 0x7FFFFFFF
#define I64_MIN (-0x8000000000000000)
#define I64_MAX 0x7FFFFFFFFFFFFFFF
#define U8_MAX 0xFF
#define U16_MAX 0xFFFF
#define U32_MAX 0xFFFFFFFF
#define U64_MAX 0xFFFFFFFFFFFFFFFF

#define CH_CTRLA 0x01
#define CH_CTRLB 0x02
#define CH_CTRLC 0x03
#define CH_CTRLD 0x04
#define CH_CTRLE 0x05
#define CH_CTRLF 0x06
#define CH_CTRLG 0x07
#define CH_CTRLH 0x08
#define CH_CTRLI 0x09
#define CH_CTRLJ 0x0A
#define CH_CTRLK 0x0B
#define CH_CTRLL 0x0C
#define CH_CTRLM 0x0D
#define CH_CTRLN 0x0E
#define CH_CTRLO 0x0F
#define CH_CTRLP 0x10
#define CH_CTRLQ 0x11
#define CH_CTRLR 0x12
#define CH_CTRLS 0x13
#define CH_CTRLT 0x14
#define CH_CTRLU 0x15
#define CH_CTRLV 0x16
#define CH_CTRLW 0x17
#define CH_CTRLX 0x18
#define CH_CTRLY 0x19
#define CH_CTRLZ 0x1A
#define CH_CURSOR 0x05
#define CH_ESC 0x1B
#define CH_SHIFT_ESC 0x1C
#define CH_SPACE ' '
#define CH_SHIFT_SPACE 0x1F
#define CH_BACKSPACE 8
#define CH_TAB 9
#define CH_RETURN '\n'
#define CH_NEW_LINE '\n'

//==================== math constants ====================
#define pi (0x400921FB54442D18(F64))
#define π pi
#define pi2 (2*pi)
#define sqrt2 (0x3FF6A09E667F3BCD(F64))
#define exp_1 (0x4005BF0A8B145769(F64))

//==================== mouse struct (mirrors host writes at MS_ADDR) ====
public class CD2I32
{
  I32 x,y;
};

public class CD3I32
{
  I32 x,y,z;
};

public class CD2I64
{
  I64 x,y;
};

public class CD3I64
{
  I64 x,y,z;
};

public class CD2
{
  F64 x,y;
};

public class CD3
{
  F64 x,y,z;
};

public U16 class CColorROPU16
{
  U8 color,rop;
};

public U32 class CColorROPU32
{
  CColorROPU16 c0,c1;
};

public U32 class CBGR24
{
  U8 b,g,r,pad;
};

public I64 class CBGR48
{
  U16 b,g,r,pad;
};
class CMouse {
  CD3I32 pos;
  I32 lb;
  I32 rb;
} ms;

//==================== device context ====================
${GR_TYPES_SRC}
${SPRITE_TYPES_SRC}
CDC gr_dc_storage;
U8 gr_scrn_bitmap[GR_WIDTH*GR_HEIGHT];
I64 gr_scrn_r[16];

${FIFO_TYPES_SRC}
${HASH_TYPES_SRC}
${TASK_TYPES_SRC}
${DIR_TYPES_SRC}
${DOC_TYPES_SRC}
${DOC_ENTRY_TYPES_SRC}
${CMP_TYPES_SRC}
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
U8 __sys_font_std[2048]={${Array.from(FONT).join(",")}};
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
I64 GetTSC() { I64 res=__time_ms()*1000000.0; return res; }

//==================== input ====================
I64 ScanChar() { return __scan_char(); }
I64 KeyGet() { return __get_char(0,0); }

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
${outputSrc}
U0 PutExcept(Bool catch_it=TRUE)
{
  "Except:%c:\n",Fs->except_ch;
  Fs->catch_except=catch_it;
}

//==================== sound ====================
F64 ona2freq_tab=0;
F64 Freq2Ona(F64 f) { return f; }
U0 Snd(I64 ona=0) {
  if (ona<=0) { __snd(0.0); return; }
  // TempleOS ona: freq = 2^((ona-1)/12) * base; we map with a simple scale.
  F64 f = 65.40639 * __pow(2.0, ona/12.0);
  __snd(f);
}
U0 Beep(I64 ona=0, I64 busy=0) { __snd(880.0); __sleep(60); __snd(0.0); }
U0 Note(F64 freq, F64 secs=0.2) { __play_note(freq, secs*1000.0); }
U0 MusicSettingsRst() {}
U0 SndTaskEndCB() { __snd(0.0); }

// Play(): minimal music-notation interpreter. Supports octave digits 1-9,
// note letters A-G (with optional # / b), durations w/h/q/e/s/t, '.' dotted,
// and space = rest. The 2nd "lyrics" arg is ignored (printed by caller normally).
I64 play_octave=4;
F64 play_whole_ms=1600.0;
F64 NoteFreq(I64 octave, I64 semitone) {
  // semitone: 0=C .. 11=B ; A4=440. MIDI number = (octave+1)*12 + semitone.
  I64 midi=(octave+1)*12+semitone;
  return 440.0*__pow(2.0,(midi-69)/12.0);
}
U0 Play(U8 *notes, U8 *lyrics=NULL) {
  I64 i=0;
  U8 c;
  F64 dur=play_whole_ms/4.0;
  while (notes[i]) {
    c=notes[i];
    if ('1'<=c<='9') { play_octave=c-'0'; i++; continue; }
    if (c=='w') { dur=play_whole_ms; i++; continue; }
    if (c=='h') { dur=play_whole_ms/2.0; i++; continue; }
    if (c=='q') { dur=play_whole_ms/4.0; i++; continue; }
    if (c=='e') { dur=play_whole_ms/8.0; i++; continue; }
    if (c=='s') { dur=play_whole_ms/16.0; i++; continue; }
    if (c=='t') { dur=play_whole_ms/32.0; i++; continue; }
    if (c==' ') { __sleep(dur); i++; continue; }
    I64 semi=-1;
    if (c=='C') semi=0;
    if (c=='D') semi=2;
    if (c=='E') semi=4;
    if (c=='F') semi=5;
    if (c=='G') semi=7;
    if (c=='A') semi=9;
    if (c=='B') semi=11;
    if (semi<0) { i++; continue; }
    i++;
    if (notes[i]=='#') { semi++; i++; }
    else if (notes[i]=='b') { semi--; i++; }
    __play_note(NoteFreq(play_octave,semi), dur);
  }
  __snd(0.0);
}

//==================== device-context / graphics ====================
${GR_MATH_SRC}
${GR_SRC}
${GR_PALETTE_SRC}
${GR_PRIMITIVES_SRC}
${STR_SRC}
${GR_COMPOSITES_SRC}
${SPRITE_SRC}
${TASK_SRC}
${TASK_MESSAGE_SRC}
${TASK_SCHEDULE_SRC}
${FIFO_SRC}
${KBD_SRC}
${WINDOW_SRC}
${docEntrySrc}
${DIR_SRC}
${FILE_SRC}
${HASH_SRC}
${DEFINE_SRC}
${CMP_SRC}

public I64 DistSqrI64(I64 x1,I64 y1,I64 x2,I64 y2)
{
  return SqrI64(x2-x1)+SqrI64(y2-y1);
}

public U0 SwapI64(I64 *a,I64 *b)
{
  I64 tmp=*a;
  *a=*b;*b=tmp;
}

public U0 SwapU16(U16 *a,U16 *b)
{
  U16 tmp=*a;
  *a=*b;*b=tmp;
}

public U32 *MemSetU32(U32 *dst,I64 val,I64 cnt)
{
  U32 *res=dst+cnt;
  while (cnt-->0) *dst++=val;
  return res;
}

Bool IsPixCovered0(CTask *task,I64,I64)
{//The host supplies one window; other task windows need a compositor.
  if (task!=Fs) throw('Graphics',TRUE);
  return FALSE;
}

U0 __gr_sync(CDC *dc,I64 x,I64 y,I64 w,I64 h)
{//Publish a changed part of the screen bitmap to the host display.
  if (dc->body!=gr.dc->body || dc->flags&DCF_DONT_DRAW) return;
  if (dc->flags&DCF_SCRN_BITMAP) {
    x+=dc->win_task->pix_left+dc->win_task->scroll_x;
    y+=dc->win_task->pix_top+dc->win_task->scroll_y;
  }
  __gr_update(dc->body,dc->width_internal,x,y,w,h);
}

public I64 GrRect(CDC *dc=gr.dc,I64 x,I64 y,I64 w,I64 h)
{
  I64 res=__GrRect(dc,x,y,w,h);
  if (res) __gr_sync(dc,x,y,w,h);
  return res;
}

public I64 GrFloodFill(CDC *dc=gr.dc,I64 x,I64 y,
        Bool not_color=FALSE,I64 z=0,I32 *db=NULL)
{
  I64 res=__GrFloodFill(dc,x,y,not_color,z,db);
  if (res && dc->body==gr.dc->body)
    __gr_update(dc->body,dc->width_internal,0,0,dc->width,dc->height);
  return res;
}

public I64 GrHLine(CDC *dc=gr.dc,I64 x1,I64 x2,I64 y,I64 z1=0,I64 z2=0)
{
  I64 res=__GrHLine(dc,x1,x2,y,z1,z2);
  if (res && dc->depth_buf)
    __gr_sync(dc,MinI64(x1,x2),y,AbsI64(x2-x1)+1,1);
  return res;
}

public I64 GrVLine(CDC *dc=gr.dc,I64 x,I64 y1,I64 y2,I64 z1=0,I64 z2=0)
{
  I64 res=__GrVLine(dc,x,y1,y2,z1,z2);
  if (res && dc->depth_buf)
    __gr_sync(dc,x,MinI64(y1,y2),1,AbsI64(y2-y1)+1);
  return res;
}

public I64 GrBlot(CDC *dc=gr.dc,I64 x,I64 y,CDC *img)
{
  I64 res=__GrBlot(dc,x,y,img);
  if (res) __gr_sync(dc,x,y,img->width,img->height);
  return res;
}

public I64 GrPutChar(CDC *dc=gr.dc,I64 x,I64 y,U8 ch)
{
  I64 res=__GrPutChar(dc,x,y,ch);
  if (res) __gr_sync(dc,x,y,FONT_WIDTH,FONT_HEIGHT);
  return res;
}

public U0 GrBorder(CDC *dc=gr.dc,I64 x1,I64 y1,I64 x2,I64 y2,
	I64 step=1,I64 start=0)
{//2D. Transformation with thick.
//Can be used with ROPF_DITHER+WHITE<<16+BLACK for dotted rect.
  GrLine3(dc,x1,y1,0,x2,y1,0,step,start);
  GrLine3(dc,x2,y1,0,x2,y2,0,step,start);
  GrLine3(dc,x2,y2,0,x1,y2,0,step,start);
  GrLine3(dc,x1,y2,0,x1,y1,0,step,start);
}

U0 GrSprite(CDC *dc,I64 x,I64 y,U8 *image,I64 w,I64 h,I64 scale=1)
{//Legacy web bitmap helper; native programs use GrBlot.
  I64 xx,yy;
  CColorROPU32 old_color;
  if (!dc) dc=gr.dc;
  old_color=dc->color;
  if (scale<1) scale=1;
  for (yy=0;yy<h;yy++)
    for (xx=0;xx<w;xx++)
      if (image[yy*w+xx]!=TRANSPARENT) {
        dc->color=image[yy*w+xx];
        GrRect(dc,x+xx*scale,y+yy*scale,scale,scale);
      }
  dc->color=old_color;
}

//==================== misc no-ops demos sometimes call ====================
U0 Refresh()
{
  __gr_update(gr.dc->body,gr.dc->width_internal,0,0,gr.dc->width,gr.dc->height);
  __gr_flip;
}
U0 Free(U8 *p) { __free(p); }
I64 MSize(U8 *p) { return __msize(p); }
I64 MSize2(U8 *p) { return __msize2(p); }
U8 *MAlloc(I64 size,CTask *mem_task=NULL)
{
  U8 *res;
  if (mem_task && mem_task!=Fs) {
    res=__malloc_for(size,mem_task);
    if (res==-1) throw('HeapTask',TRUE);
  } else
    res=__malloc(size);
  if (!res) throw('OutMem',TRUE);
  return res;
}

U8 *CAlloc(I64 size,CTask *mem_task=NULL)
{
  U8 *res=MAlloc(size,mem_task);
  MemSet(res,0,size);
  return res;
}

U8 *AMAlloc(I64 size)
{//Allocate storage whose lifetime is independent of the caller task.
  U8 *res=__malloc_kernel(size);
  if (!res) throw('OutMem',TRUE);
  return res;
}

U8 *MAllocIdent(U8 *src,CTask *mem_task=NULL)
{//Copy the complete usable contents of a heap node.
  U8 *res;
  I64 size;
  if (!src) return NULL;
  size=MSize(src);
  res=MAlloc(size,mem_task);
  MemCpy(res,src,size);
  return res;
}

U8 *AMAllocIdent(U8 *src)
{//Copy a heap node into the session kernel's heap.
  U8 *res;
  I64 size;
  if (!src) return NULL;
  size=MSize(src);
  res=AMAlloc(size);
  MemCpy(res,src,size);
  return res;
}

U8 *ACAlloc(I64 size)
{
  U8 *res=AMAlloc(size);
  MemSet(res,0,size);
  return res;
}

//==================== runtime init (called by __rt_init) ====================
U0 __hcrt_init()
{
  Fs=&fs_storage;
  Fs->addr=Fs;
  Fs->task_signature=TASK_SIGNATURE_VAL;
  Fs->pix_width=__gr_width;
  Fs->pix_height=__gr_height;
  Fs->pix_right=Fs->pix_width-1;
  Fs->pix_bottom=Fs->pix_height-1;
  Fs->win_width=(Fs->pix_width+FONT_WIDTH-1)/FONT_WIDTH;
  Fs->win_height=(Fs->pix_height+FONT_HEIGHT-1)/FONT_HEIGHT;
  Fs->win_right=Fs->win_width-1;
  Fs->win_bottom=Fs->win_height-1;
  Fs->display_flags=1<<DISPLAYf_SHOW|1<<DISPLAYf_NO_BORDER;
  Fs->next_task=Fs->last_task=sys_winmgr_task=Fs;
  sys_focus_task=Fs;
  Fs->next_child_task=Fs->last_child_task=
        (&Fs->next_child_task)(U8 *)-offset(CTask.next_sibling_task);
  Fs->next_input_filter_task=Fs->last_input_filter_task=Fs;
  JobCtrlInit(&Fs->srv_ctrl);
}

U0 __hgr_init()
{
  I64 i,j,bits;
  gr.dc=&gr_dc_storage;
  gr.dc->width=gr.dc->width_internal=GR_WIDTH;
  gr.dc->height=GR_HEIGHT;
  gr.dc->body=gr_scrn_bitmap;
  gr.dc->r=gr_scrn_r;
  gr.dc->win_task=gr.dc->mem_task=Fs;
  gr.dc->dc_signature=DCS_SIGNATURE_VAL;
  gr.dc->flags=DCF_SCRN_BITMAP|DCF_ON_TOP;
  __gr_font=sys_font_std;
  for (i=0;i<256;i++) {
    bits=0;
    for (j=0;j<8;j++) {
      gr.to_8_colors[i]|=i<<(j*8);
      if (i&1<<j) bits|=0xFF<<(j*8);
    }
    gr.to_8_bits[i]=bits;
  }
  DCRst(gr.dc);
}

U8 *MemSet(U8 *dst,I64 val,I64 cnt)
{//Returns the byte following the filled range, as REP_STOSB does.
  __memfill(dst,val,cnt);
  return dst+cnt;
}

U8 *MemCpy(U8 *dst,U8 *src,I64 cnt)
{//Native REP_MOVSB copies forward, including overlapping ranges.
  I64 i;
  if (src<dst<src+cnt)
    for (i=0;i<cnt;i++) dst[i]=src[i];
  else
    __memcopy(dst,src,cnt);
  return dst+cnt;
}

U32 BFieldExtU32(U8 *bit_field,I64 bit,I64 size)
{
  U64 *ptr=bit_field+(bit(U64)>>3);
  return (*ptr>>(bit&7))&((1<<size)-1);
}

I64 MemCmp(U8 *a,U8 *b,I64 cnt)
{//Compare unsigned bytes; native returns only -1, 0 or 1.
  while (cnt-->0) {
    if (*a<*b) return -1;
    if (*a>*b) return 1;
    a++;b++;
  }
  return 0;
}
I64 StrLen(U8 *s) { I64 n=0; while (s[n]) n++; return n; }
U0 StrCpy(U8 *d, U8 *s) { I64 i=0; while (s[i]) { d[i]=s[i]; i++; } d[i]=0; }
I64 StrCmp(U8 *a, U8 *b) {
  I64 i=0;
  while (a[i] && a[i]==b[i]) i++;
  return a[i]-b[i];
}
${RAW_SRC}
`;}

export const PRELUDE_SRC=Prelude();
