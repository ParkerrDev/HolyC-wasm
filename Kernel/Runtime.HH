
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
