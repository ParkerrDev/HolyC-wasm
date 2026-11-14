
#define I64_MIN 0x8000000000000000
#define TRANSPARENT 0xFF
#define COLOR_MONO 0xFF
#define ROPB_EQU 0
#define ROPB_XOR 1
#define ROPB_COLLISION 2
#define ROPB_MONO 3
#define ROPBF_HALF_RANGE_COLOR 0x10
#define ROPBF_TWO_SIDED 0x20
#define ROPBF_DITHER 0x40
#define ROPBF_PROBABILITY_DITHER 0x80
#define ROP_EQU (ROPB_EQU<<8)
#define ROP_XOR (ROPB_XOR<<8)
#define ROP_COLLISION (ROPB_COLLISION<<8)
#define ROP_MONO (ROPB_MONO<<8)
#define ROPF_HALF_RANGE_COLOR 0x1000
#define ROPF_TWO_SIDED 0x2000
#define ROPF_DITHER 0x40000000
#define ROPF_PROBABILITY_DITHER 0x80000000
#define COLORROP_COLORS_MASK 0x00FF00FF
#define COLORROP_NO_ROP0_MASK 0xFFFF00FF
#define COLORROP_BITS 16
#define DCF_COMPRESSED 1
#define DCF_PALETTE 2
#define DCF_NO_TRANSPARENTS 4
#define DCF_TRANSFORMATION 0x100
#define DCF_SYMMETRY 0x200
#define DCF_JUST_MIRROR 0x400
#define DCF_LOCATE_NEAREST 0x800
#define DCF_DONT_DRAW 0x1000
#define DCF_ALIAS 0x2000
#define DCF_SCRN_BITMAP 0x4000
#define DCF_FILL_NOT_COLOR 0x8000
#define DCF_RECORD_EXTENTS 0x10000
#define DCF_ON_TOP 0x20000
#define DCS_SIGNATURE_VAL 'DvCS'
#define GR_SCALE (1<<32)
#define CC_LEFT 1
#define CC_RIGHT 2
#define CC_TOP 4
#define CC_BOTTOM 8
extern class CTask;

public I64 class CDate
{
  U32	time;
  I32	date;
};

class CGrSym
{
  I32	sx,sy,sz,pad;
//Normal of symmetry plane
  I64	snx,sny,snz;
};

public class CDC
{
  U0	start;
  CDate cdt;
  I32	x0,y0,
	width,width_internal,
	height,
	flags;
  U0	end;
  CBGR48 palette[COLORS_NUM];

  //public (Change directly)
  CColorROPU32 color,
	bkcolor, //Set for use with $LK,"ROP_COLLISION",A="MN:ROP_COLLISION"$
	color2; //Internally used for $LK,"GrFloodFill",A="MN:GrFloodFill"$()
  CD3I32 ls; //Light source (should be normalized to 65536).

  //dither_probability_u16 is basically a U16.
  //It is activated by $LK,"ROPF_PROBABILITY_DITHER",A="MN:ROPF_PROBABILITY_DITHER"$.
  //0x0000 =100% color.c0
  //0x8000 =50%  color.c0   50% color.c1
  //0x10000=100% color.c1
  //See $LK,"::/Demo/Graphics/SunMoon.HC"$ and	$LK,"::/Demo/Graphics/Shading.HC"$.
  U64 dither_probability_u16;

  CDC *brush;

  //Set with $LK,"DCMat4x4Set",A="MN:DCMat4x4Set"$().  $LK,"Free",A="MN:Free"$() before setting.
  I64	*r, //rotation matrix of quads decimal in lo
	r_norm; //shifted 32 bits.  Used for scaling thick

  //public (Change directly)
  I32	x,y,z,
	thick;

  //Can be changed from the default $LK,"DCTransform",A="MN:DCTransform"$()
  U0	(*transform)(CDC *dc,I64 *x,I64 *y,I64 *z);

  //Can be changed from the default $LK,"DCLighting",A="MN:DCLighting"$()
  U0	(*lighting)(CDC *dc,CD3I32 *p1,CD3I32 *p2,
	CD3I32 *p3,CColorROPU32 color);

  //Set by $LK,"DCSymmetrySet",A="MN:DCSymmetrySet"$() or $LK,"DCSymmetry3Set",A="MN:DCSymmetry3Set"$()
  CGrSym sym;

  I32	cur_x,cur_y,cur_z,pad;
  I64	collision_cnt;

  I64	nearest_dist,
	min_x,max_x,min_y,max_y; //Set by $LK,"DCF_RECORD_EXTENTS",A="MN:DCF_RECORD_EXTENTS"$ (scrn coordinates)

  U32	dc_signature,pad;
  CTask	*mem_task,*win_task;
  CDC	*alias;
  U8	*body;

  //Set by $LK,"DCDepthBufAlloc",A="MN:DCDepthBufAlloc"$()
  I32	*depth_buf;
  I64	db_z; //private
};
