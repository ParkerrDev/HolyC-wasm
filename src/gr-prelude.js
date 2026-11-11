//Device contexts and raster algorithms derived from TempleOS V5.03.
//Native sources: Kernel/KernelA.HH and Adam/Gr/{GrDC,GrMath,GrBitMap,GrPrimatives}.HC.
export const GR_TYPES_SRC=String.raw`
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
#define GR_SCALE1_BITS 24
#define GR_SCALE2_BITS 8
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
`;

export const GR_SRC=String.raw`
public CBGR48 gr_palette_std[COLORS_NUM]={
0x000000000000,0x00000000AAAA,0x0000AAAA0000,0x0000AAAAAAAA,
0xAAAA00000000,0xAAAA0000AAAA,0xAAAA55550000,0xAAAAAAAAAAAA,
0x555555555555,0x55555555FFFF,0x5555FFFF5555,0x5555FFFFFFFF,
0xFFFF55555555,0xFFFF5555FFFF,0xFFFFFFFF5555,0xFFFFFFFFFFFF};

public U0 Mat4x4MulXYZ(I64 *r,I64 *_x,I64 *_y,I64 *_z)
{//Rotate 3D point using 4x4 matrix. Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  I64 x1,y1,z1,xx=*_x,yy=*_y,zz=*_z;
  x1=(r[0*4+0]*xx+r[0*4+1]*yy+r[0*4+2]*zz+r[0*4+3])>>32;
  y1=(r[1*4+0]*xx+r[1*4+1]*yy+r[1*4+2]*zz+r[1*4+3])>>32;
  z1=(r[2*4+0]*xx+r[2*4+1]*yy+r[2*4+2]*zz+r[2*4+3])>>32;
  *_x=x1;*_y=y1;*_z=z1;
}

public U0 DCTransform(CDC *dc,I64 *_x,I64 *_y,I64 *_z)
{//This is the dft dc->transform() callback.
//Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  Mat4x4MulXYZ(dc->r,_x,_y,_z);
  *_x+=dc->x;
  *_y+=dc->y;
  *_z+=dc->z;
}

public I64 *Mat4x4IdentEqu(I64 *r)
{//Set matrix to identity. Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  MemSet(r,0,sizeof(I64)*16);
  r[0*4+0].i32[1]=1;
  r[1*4+1].i32[1]=1;
  r[2*4+2].i32[1]=1;
  r[3*4+3].i32[1]=1;
  return r;
}

public I64 Mat4x4NormSqr65536(I64 *r)
{//Norm Squared of r.
//(1.0/Sqrt(3))*65536=37837.22
  return SqrI64((r[0*4+0]*37838+r[0*4+1]*37838+r[0*4+2]*37838)>>32)+
	SqrI64((r[1*4+0]*37837+r[1*4+1]*37837+r[1*4+2]*37837)>>32)+
	SqrI64((r[2*4+0]*37837+r[2*4+1]*37837+r[2*4+2]*37837)>>32);
}

public U0 DCMat4x4Set(CDC *dc=NULL,I64 *r)
{//Set device context's rot matrix. Will be $LK,"Free",A="MN:Free"$d() in $LK,"DCDel",A="MN:DCDel"$().Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
//The main purpose is to set matrix norm for thick scaling.
  //NULL as dc means gr.dc
  if (!dc)   dc=gr.dc;
  dc->r=r;
  dc->r_norm=Sqrt(Mat4x4NormSqr65536(r))*65536; //scaled 32 bits
}

public U0 DCLighting(CDC *dc,
	CD3I32 *p1,CD3I32 *p2,CD3I32 *p3,CColorROPU32 color)
{//This is the dft dc->lighting() callback.
  CD3I32 v1,v2;
  I64 i,vn_x,vn_y,vn_z;
  F64 d;

  v1.x=p1->x-p2->x;
  v1.y=p1->y-p2->y;
  v1.z=p1->z-p2->z;

  v2.x=p3->x-p2->x;
  v2.y=p3->y-p2->y;
  v2.z=p3->z-p2->z;

  //V1 and V2 are vects along two sides
  //of the tri joined at p2.

  vn_x=v1.y*v2.z-v1.z*v2.y;
  vn_y=v1.z*v2.x-v1.x*v2.z;
  vn_z=v1.x*v2.y-v1.y*v2.x;
  if (d=Sqrt(SqrI64(vn_x)+SqrI64(vn_y)+SqrI64(vn_z)))
    d=1<<16/d;
  vn_x*=d;
  vn_y*=d;
  vn_z*=d;
//Vn is the cross product of V1 and V3
  //which means it is perpendicular.  It
  //is the normal vect to the surface.
  //It has been scaled to length 65536.

  //Light source has been scaled to length 65536.
  i=(vn_x*dc->ls.x+vn_y*dc->ls.y+vn_z*dc->ls.z)>>16;
//The dot product of the light source
  //vect and the surface normal
  //gives an illumination number.
  //65536*65536>>16=65536

  //TempleOS will generate a random U16
  //and compare to dither_probability_u16 and
  //will pick from two colors.
  //Probability dithering does not work with thick>1 at this time.
  if (color.c0.rop&ROPBF_TWO_SIDED) {
    color.c0.rop&=~ROPBF_TWO_SIDED;
    i=AbsI64(i)<<1;
  } else
    i+=65536;
  if (color.c0.rop&ROPBF_HALF_RANGE_COLOR) {
    color.c0.rop&=~ROPBF_HALF_RANGE_COLOR;
    i>>=1;
    if (color>=8) {
      color-=8;
      i+=65536;
    }
  }
  if (i<65536) {
    dc->color=ROPF_PROBABILITY_DITHER+color<<16+BLACK;
    dc->dither_probability_u16=i;
  } else {
    dc->color=ROPF_PROBABILITY_DITHER+(color^8)<<16+color;
    dc->dither_probability_u16=i-65536;
  }
}

public U0 DCFill(CDC *dc=NULL,CColorROPU32 val=TRANSPARENT)
{//Fill entire device context with color.
  if (!dc) dc=gr.dc;
  MemSet(dc->body,val,dc->width_internal*dc->height);
  if (dc->body==gr.dc->body)
    __gr_update(dc->body,dc->width_internal,0,0,dc->width,dc->height);
}

public U0 DCClear(CDC *dc=NULL)
{//Set entire device context image body to 0 (BLACK).
  if (!dc) dc=gr.dc;
  DCFill(dc,0);
}

public U0 DCRst(CDC *dc)
{//Reset $LK,"CDC",A="MN:CDC"$ structure members but not image body, itself.
  dc->color=BLACK;
  dc->color2=BLACK;
  dc->bkcolor=BLACK;
  dc->collision_cnt=0;
  dc->thick=1;
  dc->ls.x=37837; //1<<16/Sqrt(3)
  dc->ls.y=37837;
  dc->ls.z=37837;
  dc->x=0;
  dc->y=0;
  dc->z=0;
  dc->transform=&DCTransform;
  dc->lighting =&DCLighting;
  Mat4x4IdentEqu(dc->r);
  dc->r_norm=GR_SCALE;
  dc->flags&=~(DCF_SYMMETRY|DCF_TRANSFORMATION|DCF_JUST_MIRROR);
  MemCpy(dc->palette,gr_palette_std,sizeof(CBGR48)*COLORS_NUM);
}

public U0 DCExtentsInit(CDC *dc=NULL)
{//Init markers for extent of next newly drawn graphics.
//NULL means gr.dc
  //See $LK,"::/Demo/Graphics/Extents.HC"$
  //You should clear the record flag yourself
  if (!dc)   dc=gr.dc;
  dc->flags|=DCF_RECORD_EXTENTS;
  dc->min_x=I64_MAX;
  dc->max_x=I64_MIN;
  dc->min_y=I64_MAX;
  dc->max_y=I64_MIN;
}

public CDC *DCAlias(CDC *dc=NULL,CTask *task=NULL)
{//Create alias of dc, so can change pen, color, etc.
//NULL means gr.dc
  CDC *res;
  if (!dc)   dc=gr.dc;
  if (!task) task=Fs;
  if (dc->dc_signature!=DCS_SIGNATURE_VAL)
    throw('Graphics');
  res=MAlloc(sizeof(CDC),task);
  MemCpy(res,dc,sizeof(CDC));
  res->win_task=res->mem_task=task;
  res->r=MAlloc(16*sizeof(I64),task);
  DCRst(res);
  res->flags|=DCF_ALIAS;
  res->alias=dc;
  return res;
}

public CDC *DCNew(I64 width,I64 height,CTask *task=NULL,Bool null_bitmap=FALSE)
{//Create new width x height device context.
//Internally only allows widths which are divisible by 8.
  //Don't forget these $MA-X+PU,"sizeof(CDC)",LM="Find(\"sizeof(CDC)\",\"/*\");View;"$.
  CDC *res;
  if (!task) task=Fs;
  res=CAlloc(sizeof(CDC),task);
  res->win_task=task;
  res->mem_task=task;
  res->width=width;
  res->width_internal=(width+7)&~7;
  res->height=height;
  if (null_bitmap)
    res->flags|=DCF_DONT_DRAW;
  else
    res->body=CAlloc(res->width_internal*res->height,task);
  res->r=MAlloc(16*sizeof(I64),task);
  DCRst(res);
  res->dc_signature=DCS_SIGNATURE_VAL;
  return res;
}

public U0 DCDel(CDC *dc)
{//Free dc, image body, rot mat and depth buf.
  if (!dc) return;
  if (dc->dc_signature!=DCS_SIGNATURE_VAL)
    throw('Graphics');
  dc->dc_signature=0;
  Free(dc->r);
  if (!(dc->flags & DCF_ALIAS))
    Free(dc->body);
  Free(dc->depth_buf);
  Free(dc);
}

public I32 *DCDepthBufRst(CDC *dc)
{//Reset device context depth buf to far away.
  if (dc->depth_buf)
    MemSetU32(dc->depth_buf,I32_MAX,dc->width_internal*dc->height);
  return dc->depth_buf;
}

public I32 *DCDepthBufAlloc(CDC *dc)
{//Alloc a 32-bit depth buffer for device context.
  Free(dc->depth_buf);
  dc->depth_buf=MAlloc(dc->width_internal*dc->height*sizeof(I32),dc->mem_task);
  return DCDepthBufRst(dc);
}

public U0 DCMono(CDC *dc,
  I64 quest=TRANSPARENT,I64 true_color=0,I64 false_color=COLOR_MONO)
{//Set entire device context to one of two colors.
  I64 i;
  U8 *dst;
  dst=dc->body;
  i=dc->width_internal*dc->height;
  while (i--)
    if (*dst==quest)
      *dst++=true_color;
    else
      *dst++=false_color;
}

public I64 DCColorChg(CDC *dc,I64 src_color,I64 dst_color=TRANSPARENT)
{//Find and replace src color with dst in device context.
  I64 i,res=0;
  U8 *dst;
  dst=dc->body;
  i=dc->width_internal*dc->height;
  while (i--)
    if (*dst==src_color) {
      *dst++=dst_color;
      res++;
    } else
      dst++;
  return res;
}

public Bool Line(U8 *aux_data,I64 x1,I64 y1,I64 z1,I64 x2,I64 y2,I64 z2,
	Bool (*fp_plot)(U8 *aux,I64 x,I64 y,I64 z),I64 step=1,I64 start=0)
{//Step through line segment calling callback.
//Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  I64 i,j,d,dx=x2-x1,dy=y2-y1,dz=z2-z1,_x,_y,_z,
	adx=AbsI64(dx),ady=AbsI64(dy),adz=AbsI64(dz);
  Bool first=TRUE;
  if (adx>=ady) {
    if (adx>=adz) {
      if (d=adx) {
	if (dx>=0)
	  dx=0x100000000;
	else
	  dx=-0x100000000;
	dy=dy<<32/d;
	dz=dz<<32/d;
      }
    } else {
      if (d=adz) {
	dx=dx<<32/d;
	dy=dy<<32/d;
	if (dz>=0)
	  dz=0x100000000;
	else
	  dz=-0x100000000;
      }
    }
  } else {
    if (ady>=adz) {
      if (d=ady) {
	dx=dx<<32/d;
	if (dy>=0)
	  dy=0x100000000;
	else
	  dy=-0x100000000;
	dz=dz<<32/d;
      }
    } else {
      if (d=adz) {
	dx=dx<<32/d;
	dy=dy<<32/d;
	if (dz>=0)
	  dz=0x100000000;
	else
	  dz=-0x100000000;
      }
    }
  }
  x1<<=32; y1<<=32; z1<<=32;
  for (j=0;j<start;j++) {
    x1+=dx; y1+=dy; z1+=dz;
  }
  if (step!=1 && step!=0) {
    dx*=step;
    dy*=step;
    dz*=step;
    d/=step;
  }
  for (i=start;i<=d;i++) {
    if ((_x!=x1.i32[1] || _y!=y1.i32[1] || _z!=z1.i32[1] || first) &&
	  !(*fp_plot)(aux_data,x1.i32[1],y1.i32[1],z1.i32[1]))
      return FALSE;
    first=FALSE;
    _x=x1.i32[1]; _y=y1.i32[1]; _z=z1.i32[1];
    x1+=dx; y1+=dy; z1+=dz;
  }
  if (step==1 && (_x!=x2 || _y!=y2 || _z!=z2) && !(*fp_plot)(aux_data,x2,y2,z2))
    return FALSE;
  return TRUE;
}

public Bool Circle(U8 *aux_data,I64 cx,I64 cy,I64 cz,I64 radius,
	Bool (*fp_plot)(U8 *aux,I64 x,I64 y,I64 z),
	I64 step=1,F64 start_radians=0,F64 len_radians=2*π)
{//Step through circle arc calling callback.
  I64 i,j,len=Ceil(len_radians*radius),
	x,y,x1,y1,s1,s2,c;
  F64 t;
  if (radius<=0 || !step) return TRUE;
  t=1.0/radius;
  c=1<<GR_SCALE1_BITS*Cos(t);
  if (step<0) {
    step=-step;
    s2=1<<GR_SCALE1_BITS*Sin(t);
    s1=-s2;
  } else {
    s1=1<<GR_SCALE1_BITS*Sin(t);
    s2=-s1;
  }
  if (start_radians) {
    x=radius*Cos(start_radians);
    y=-radius*Sin(start_radians);
  } else {
    x=radius;
    y=0;
  }
  x<<=GR_SCALE2_BITS;
  y<<=GR_SCALE2_BITS;
  for (i=0;i<=len;i+=step) {
    if (!(*fp_plot)(aux_data,cx+x>>GR_SCALE2_BITS,cy+y>>GR_SCALE2_BITS,cz))
      return FALSE;
    for (j=0;j<step;j++) {
      x1=(c*x+s1*y)>>GR_SCALE1_BITS;
      y1=(s2*x+c*y)>>GR_SCALE1_BITS;
      x=x1; y=y1;
    }
  }
  return TRUE;
}

public Bool ClipLine(I64 *_x1,I64 *_y1,I64 *_x2,I64 *_y2,
	I64 left,I64 top,I64 right,I64 bottom)
{//Clip x1,y1 x2,y2 with left,top,right,bottom.
  I64 x,y,x1=*_x1,y1=*_y1,x2=*_x2,y2=*_y2,
	cc,cc1,cc2;
  if (y1>bottom)
    cc1=CC_BOTTOM;
  else if (y1<top)
    cc1=CC_TOP;
  else
    cc1=0;
  if (x1>right)
    cc1|=CC_RIGHT;
  else if (x1<left)
    cc1|=CC_LEFT;

  if (y2>bottom)
    cc2=CC_BOTTOM;
  else if (y2<top)
    cc2=CC_TOP;
  else
    cc2=0;
  if (x2>right)
    cc2|=CC_RIGHT;
  else if (x2<left)
    cc2|=CC_LEFT;

  while (TRUE) {
    if (!(cc1|cc2))
      return TRUE;
    if (cc1&cc2)
      return FALSE;

    if (cc1)
      cc=cc1;
    else
      cc=cc2;

    if (cc&CC_BOTTOM) {
      x=x1+(x2-x1)*(bottom-y1)/(y2-y1);
      y=bottom;
    } else if (cc&CC_TOP) {
      x=x1+(x2-x1)*(top-y1)/(y2-y1);
      y=top;
    } else if (cc&CC_RIGHT) {
      y=y1+(y2-y1)*(right-x1)/(x2-x1);
      x=right;
    } else {
      y=y1+(y2-y1)*(left-x1)/(x2-x1);
      x=left;
    }

    if (cc==cc1) {
      *_x1=x1=x;
      *_y1=y1=y;
      if (y1>bottom)
	cc1=CC_BOTTOM;
      else if (y1<top)
	cc1=CC_TOP;
      else
	cc1=0;
      if (x1>right)
	cc1|=CC_RIGHT;
      else if (x1<left)
	cc1|=CC_LEFT;
    } else {
      *_x2=x2=x;
      *_y2=y2=y;
      if (y2>bottom)
	cc2=CC_BOTTOM;
      else if (y2<top)
	cc2=CC_TOP;
      else
	cc2=0;
      if (x2>right)
	cc2|=CC_RIGHT;
      else if (x2<left)
	cc2|=CC_LEFT;
    }
  }
}

public Bool GrPlot0(CDC *dc=gr.dc,I64 x,I64 y)
{//2D. No clipping or transformation or thick.
  U8 *dst;
  I32 *db;
  I64 d,dist;
  CColorROPU32 c,color=dc->color,bkcolor=dc->bkcolor;

  if (dc->flags & DCF_LOCATE_NEAREST) {
    dist=DistSqrI64(x,y,dc->cur_x,dc->cur_y);
    if (dist<=dc->nearest_dist)
      dc->nearest_dist=dist;
  }
  if (dc->flags & DCF_RECORD_EXTENTS) {
    if (x<dc->min_x) dc->min_x=x;
    if (x>dc->max_x) dc->max_x=x;
    if (y<dc->min_y) dc->min_y=y;
    if (y>dc->max_y) dc->max_y=y;
  }
  if (dc->flags & DCF_DONT_DRAW)
    return TRUE;
  d=dc->width_internal*y+x;
  if (db=dc->depth_buf) {
    db+=d;
    if (0<=dc->db_z<=*db)
      *db=dc->db_z;
    else
      return TRUE;
  }
  if (color.c1.rop&(ROPBF_DITHER|ROPBF_PROBABILITY_DITHER)) {
    if (color.c1.rop&ROPBF_PROBABILITY_DITHER) {
      if (RandU16<dc->dither_probability_u16) {
	color.c1.rop=color.c0.rop;
	color.c0=color.c1;
      }
    } else {
      if ((x^y)&1) {
	color.c1.rop=color.c0.rop;
	color.c0=color.c1;
      }
    }
  }
  dst=dc->body+d;
  switch [color.c0.rop] {
    case ROPB_EQU:
    case ROPB_MONO:
      *dst=color.c0.color;
      break;
    case ROPB_COLLISION:
      c=*dst;
      if (c!=TRANSPARENT && c!=bkcolor.c0.color)
	dc->collision_cnt++;
      break;
    case ROPB_XOR:
      *dst^=color.c0.color;
      break;
  }
  if (dc->body==gr.dc->body)
    __gr_plot(x,y,*dst);
  return TRUE;
}

public I64 GrPeek0(CDC *dc=gr.dc,I64 x,I64 y)
{//2D. No clipping or transformation.
  return dc->body[dc->width_internal*y+x];
}

public I64 __GrBlot(CDC *dc=gr.dc,I64 x,I64 y,CDC *img)
{//2D. Clipping but not transformation..
  I64 i,j,k,k1,kk,kk1,w1,h1,w2,h2,dist,
	leading_pixels,leading_pixel_mask,whole_I64s,
	trailing_pixels,trailing_pixel_mask,
	reg bit_shift,win_z_buf_line_inc,win_z_buf_line_dec,win_z_num,
	color_mask;
  U8 reg *dst,*src;
  I32 *db;
  U16 reg *win_z_buf_ptr;
  CColorROPU32 color,c,old_color;
  CTask *win_task;

  if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->scroll_x;
    y+=win_task->scroll_y;
  }
  if (x<0)
    w1=-x;
  else
    w1=0;
  if (y<0)
    h1=-y;
  else
    h1=0;
  w2=img->width;
  h2=img->height;
  if (dc->flags & DCF_SCRN_BITMAP) {
    x+=win_task->pix_left;
    y+=win_task->pix_top;
  }
  if (dc->flags & DCF_LOCATE_NEAREST) {
    dist=DistSqrI64(x+img->width>>1,y+img->height>>1,dc->cur_x,dc->cur_y);
    if (dist<=dc->nearest_dist)
      dc->nearest_dist=dist;
  }
  if (dc->flags & DCF_SCRN_BITMAP) {
    if (x+w1<0) w1=-x;
    if (x+w2>win_task->pix_right+1)
      w2=win_task->pix_right+1-x;

    if (y+h1<0) h1=-y;
    if (y+h2>win_task->pix_bottom+1)
      h2=win_task->pix_bottom+1-y;
  }
  if (x+w2>dc->width)
    w2=dc->width-x;
  if (y+h2>dc->height)
    h2=dc->height-y;
  if (w1<w2<=img->width && h1<h2<=img->height) {
    if (dc->flags & DCF_RECORD_EXTENTS) {
      if (x+w1<dc->min_x) dc->min_x=x+w1;
      if (x+w2-1>dc->max_x) dc->max_x=x+w2-1;
      if (y+h1<dc->min_y) dc->min_y=y+h1;
      if (y+h2-1>dc->max_y) dc->max_y=y+h2-1;
    }
    if (dc->flags & DCF_DONT_DRAW)
      return 1;
    old_color=dc->color;
    db=dc->depth_buf;
    dc->depth_buf=NULL;
    dc->color&=~ROPF_DITHER;
    color=dc->color;
    leading_pixels=-(w1+x)&7;
    leading_pixel_mask=gr.to_8_bits[0xFF>>leading_pixels];
    bit_shift=-x&7;
    whole_I64s=(w2-w1-leading_pixels)>>3;
    if (whole_I64s<0) whole_I64s=0;
    trailing_pixels=(x+w2)&7;
    trailing_pixel_mask=gr.to_8_bits[0xFF<<trailing_pixels&0xFF];
    if (leading_pixels+trailing_pixels>w2-w1) {
      leading_pixel_mask|=trailing_pixel_mask;
      trailing_pixels=0;
    }
    switch (color.c0.rop) {
      case ROPB_COLLISION: //TODO: Might want to check win_z_buf
	color=dc->bkcolor.c0.color;
	k=h1*img->width_internal;
	k1=(h1+y)*dc->width_internal+x;
	for (j=h2-h1;j;j--) {
	  for (i=w1;i<w2;i++) {
	    c=dc->body[k1+i];
	    if (c!=TRANSPARENT && c!=color && img->body[k+i]!=TRANSPARENT)
	      dc->collision_cnt++;
	  }
	  k+=img->width_internal;
	  k1+=dc->width_internal;
	}
	break;
      case ROPB_MONO:
	color_mask=gr.to_8_colors[color.c0.color];
	if (img->flags&DCF_NO_TRANSPARENTS) {
	  if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP)
	    win_z_buf_ptr=NULL;
	  else {
	    win_z_num=win_task->win_z_num;
	    win_z_buf_ptr=gr.win_z_buf(U8 *)+((h1+y)/FONT_HEIGHT*TEXT_COLS+
		  (w1+x)/FONT_WIDTH)*sizeof(U16);
	    win_z_buf_line_dec=whole_I64s;
	    if (leading_pixels)
	      win_z_buf_line_dec++;
	    if (trailing_pixels)
	      win_z_buf_line_dec++;
	    win_z_buf_line_dec*=sizeof(U16);
	    win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
	  }
	  kk= h1   *img ->width_internal+w1;
	  kk1=(h1+y)*dc->width_internal+x+w1;
	  kk=(kk-bit_shift)&~7+bit_shift;
	  bit_shift*=8;
	  if (win_z_buf_ptr)
	    for (j=h1;j<h2;j++) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (win_z_num>=*win_z_buf_ptr++) {
		  if (bit_shift)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  (*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift))&
			  ~leading_pixel_mask&color_mask;
		  else
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  *src(I64 *)++&~leading_pixel_mask&color_mask;
		} else {
		  src(I64 *)++;
		  dst(I64 *)++;
		}
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++=(*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift))&color_mask;
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      else
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++=*src(I64 *)++&color_mask;
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&
			~trailing_pixel_mask&color_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*src(I64 *)++&~trailing_pixel_mask&color_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	      if ((j+y)&7==7)
		win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
	      else
		win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
	    }
	  else
	    for (j=h2-h1;j;j--) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (bit_shift)
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&
			~leading_pixel_mask&color_mask;
		else
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			*src(I64 *)++&~leading_pixel_mask&color_mask;
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++=(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&color_mask;
	      else
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++=*src(I64 *)++&color_mask;

	      if (trailing_pixels) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&
			~trailing_pixel_mask&color_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*src(I64 *)++&~trailing_pixel_mask&color_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	    }
	} else {
	  k=h1*img->width_internal;
	  if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP) {
	    for (j=h1;j<h2;j++) {
	      for (i=w1;i<w2;i++)
		if (img->body[k+i])
		  GrPlot0(dc,x+i,y+j);
	      k+=img->width_internal;
	    }
	  } else {
	    win_z_num		=win_task->win_z_num;
	    win_z_buf_ptr	=gr.win_z_buf(U8 *)+
		  ((h1+y)/FONT_HEIGHT*TEXT_COLS+(w1+x)/FONT_WIDTH)*sizeof(U16);
	    win_z_buf_line_dec=whole_I64s;
	    if (leading_pixels)
	      win_z_buf_line_dec++;
	    if (trailing_pixels)
	      win_z_buf_line_dec++;
	    win_z_buf_line_dec*=sizeof(U16);
	    win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
	    for (j=h1;j<h2;j++) {
	      if (win_z_num>=*win_z_buf_ptr++)
		color_mask=TRUE;
	      else
		color_mask=FALSE;
	      for (i=w1;i<w2;) {
		if (color_mask)
		  if (img->body[k+i])
		    GrPlot0(dc,x+i,y+j);
		if (!((++i+x) &7) && i<w2) {
		  if (win_z_num>=*win_z_buf_ptr++)
		    color_mask=TRUE;
		  else
		    color_mask=FALSE;
		}
	      }
	      if ((j+y)&7==7)
		win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
	      else
		win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
	      k+=img->width_internal;
	    }
	  }
	}
	break;
      case ROPB_EQU:
	if (img->flags&DCF_NO_TRANSPARENTS) {
	  if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP)
	    win_z_buf_ptr=NULL;
	  else {
	    win_z_num=win_task->win_z_num;
	    win_z_buf_ptr=gr.win_z_buf(U8 *)+
		  ((h1+y)/FONT_HEIGHT*TEXT_COLS+(w1+x)/FONT_WIDTH)*sizeof(U16);
	    win_z_buf_line_dec=whole_I64s;
	    if (leading_pixels)
	      win_z_buf_line_dec++;
	    if (trailing_pixels)
	      win_z_buf_line_dec++;
	    win_z_buf_line_dec*=sizeof(U16);
	    win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
	  }
	  kk= h1   *img ->width_internal+w1;
	  kk1=(h1+y)*dc->width_internal+x+w1;
	  kk=(kk-bit_shift)&~7+bit_shift;
	  bit_shift*=8;
	  if (win_z_buf_ptr)
	    for (j=h1;j<h2;j++) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (win_z_num>=*win_z_buf_ptr++) {
		  if (bit_shift)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  (*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift))&~leading_pixel_mask;
		  else
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  *src(I64 *)++&~leading_pixel_mask;
		} else {
		  src(I64 *)++;
		  dst(I64 *)++;
		}
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++=*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift);
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      else
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++=*src(I64 *)++;
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&~trailing_pixel_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*src(I64 *)++&~trailing_pixel_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	      if ((j+y)&7==7)
		win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
	      else
		win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
	    }
	  else
	    for (j=h2-h1;j;j--) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (bit_shift)
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&~leading_pixel_mask;
		else
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			*src(I64 *)++&~leading_pixel_mask;
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++=*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift);
	      else
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++=*src(I64 *)++;

	      if (trailing_pixels) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift))&~trailing_pixel_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*src(I64 *)++&~trailing_pixel_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	    }
	} else {
here1a:
	  k=h1*img->width_internal;
	  if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP) {
	    for (j=h1;j<h2;j++) {
	      for (i=w1;i<w2;i++) {
		c=img->body[k+i];
		if (c!=TRANSPARENT) {
		  dc->color.c0.color=c;
		  GrPlot0(dc,x+i,y+j);
		}
	      }
	      k+=img->width_internal;
	    }
	  } else {
	    win_z_num		=win_task->win_z_num;
	    win_z_buf_ptr	=gr.win_z_buf(U8 *)+
		  ((h1+y)/FONT_HEIGHT*TEXT_COLS+(w1+x)/FONT_WIDTH)*sizeof(U16);
	    win_z_buf_line_dec=whole_I64s;
	    if (leading_pixels)
	      win_z_buf_line_dec++;
	    if (trailing_pixels)
	      win_z_buf_line_dec++;
	    win_z_buf_line_dec*=sizeof(U16);
	    win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
	    for (j=h1;j<h2;j++) {
	      if (win_z_num>=*win_z_buf_ptr++)
		color_mask=TRUE;
	      else
		color_mask=FALSE;
	      for (i=w1;i<w2;) {
		if (color_mask) {
		  c=img->body[k+i];
		  if (c!=TRANSPARENT) {
		    dc->color.c0.color=c;
		    GrPlot0(dc,x+i,y+j);
		  }
		}
		if (!((++i+x) &7) && i<w2) {
		  if (win_z_num>=*win_z_buf_ptr++)
		    color_mask=TRUE;
		  else
		    color_mask=FALSE;
		}
	      }
	      if ((j+y)&7==7)
		win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
	      else
		win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
	      k+=img->width_internal;
	    }
	  }
	  dc->color=color;
	}
	break;
      case ROPB_XOR:
	if (img->flags&DCF_NO_TRANSPARENTS) {
	  if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP)
	    win_z_buf_ptr=NULL;
	  else {
	    win_z_num=win_task->win_z_num;
	    win_z_buf_ptr=gr.win_z_buf(U8 *)+
		  ((h1+y)/FONT_HEIGHT*TEXT_COLS+(w1+x)/FONT_WIDTH)*sizeof(U16);
	    win_z_buf_line_dec=whole_I64s;
	    if (leading_pixels)
	      win_z_buf_line_dec++;
	    if (trailing_pixels)
	      win_z_buf_line_dec++;
	    win_z_buf_line_dec*=sizeof(U16);
	    win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
	  }
	  kk= h1   *img ->width_internal  +w1;
	  kk1=(h1+y)*dc->width_internal+x+w1;
	  kk=(kk-bit_shift)&~7+bit_shift;
	  bit_shift*=8;
	  if (win_z_buf_ptr)
	    for (j=h1;j<h2;j++) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (win_z_num>=*win_z_buf_ptr++) {
		  if (bit_shift)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  (*dst(I64 *)^(*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift)))&~leading_pixel_mask;
		  else
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  (*dst(I64 *)^*src(I64 *)++)&~leading_pixel_mask;
		} else {
		  src(I64 *)++;
		  dst(I64 *)++;
		}
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++^=*src(U64 *)++>>bit_shift|
			  *src(I64 *)<<(64-bit_shift);
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      else
		for (i=0;i<whole_I64s;i++)
		  if (win_z_num>=*win_z_buf_ptr++)
		    *dst(I64 *)++^=*src(I64 *)++;
		  else {
		    src(I64 *)++;
		    dst(I64 *)++;
		  }
	      if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*dst(I64 *)^(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift)))&~trailing_pixel_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*dst(I64 *)^*src(I64 *)++)&~trailing_pixel_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	      if ((j+y)&7==7)
		win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
	      else
		win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
	    }
	  else
	    for (j=h2-h1;j;j--) {
	      src=img->body+kk&~7;
	      dst=dc->body+kk1&~7;
	      if (leading_pixels) {
		if (bit_shift)
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			(*dst(I64 *)^(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift)))&~leading_pixel_mask;
		else
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			(*dst(I64 *)^*src(I64 *)++)&~leading_pixel_mask;
	      }
	      if (bit_shift)
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++^=*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift);
	      else
		for (i=0;i<whole_I64s;i++)
		  *dst(I64 *)++^=*src(I64 *)++;
	      if (trailing_pixels) {
		if (bit_shift)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*dst(I64 *)^(*src(U64 *)++>>bit_shift|
			*src(I64 *)<<(64-bit_shift)))&~trailing_pixel_mask;
		else
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*dst(I64 *)^*src(I64 *)++)&~trailing_pixel_mask;
	      }
	      kk +=img->width_internal;
	      kk1+=dc->width_internal;
	    }
	} else
	  goto here1a;
	break;
    }
    dc->depth_buf=db;
    dc->color=old_color;
    return 1;
  } else
    return 0;
}

public I64 __GrRect(CDC *dc=gr.dc,I64 x,I64 y,I64 w,I64 h)
{//2D. Width Height. Clipping but not transformation.
//Returns cnt of pixs changed.
  I64 i,res=0,j,k1,kk1,w1,h1,w2,h2,dist,
	leading_pixels,original_leading_pixels,whole_I64s,
	trailing_pixels,leading_pixel_mask,trailing_pixel_mask,
	win_z_buf_line_inc,win_z_buf_line_dec,win_z_num,color_mask;
  U8 reg *dst;
  U16 reg *win_z_buf_ptr;
  CColorROPU32 color,c,dither_colors;
  Bool dither,probability_dither;
  CTask *win_task;

  if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->scroll_x;
    y+=win_task->scroll_y;
  }

  if (x<0)
    w1=-x;
  else
    w1=0;
  if (y<0)
    h1=-y;
  else
    h1=0;
  w2=w;
  h2=h;

  if (dc->flags & DCF_SCRN_BITMAP) {
    x+=win_task->pix_left;
    y+=win_task->pix_top;
  }
  if (dc->flags & DCF_LOCATE_NEAREST) {//TODO:Untested
    if (x<=dc->cur_x<=x+w && y<=dc->cur_y<=y+h)
      dist=0;
    else
      dist=DistSqrI64(x+w>>1,y+h>>1,dc->cur_x,dc->cur_y);
    if (dist<=dc->nearest_dist)
      dc->nearest_dist=dist;
  }
  if (dc->flags & DCF_SCRN_BITMAP) {
    if (x+w1<0) w1=-x;
    if (x+w2>win_task->pix_right+1)
      w2=win_task->pix_right+1-x;

    if (y+h1<0) h1=-y;
    if (y+h2>win_task->pix_bottom+1)
      h2=win_task->pix_bottom+1-y;
  }
  if (x+w2>dc->width)
    w2=dc->width-x;
  if (y+h2>dc->height)
    h2=dc->height-y;
  if (w1<w2<=w && h1<h2<=h) {
    if (dc->flags & DCF_RECORD_EXTENTS) {
      if (x+w1	<dc->min_x) dc->min_x=x+w1;
      if (x+w2-1>dc->max_x) dc->max_x=x+w2-1;
      if (y+h1	<dc->min_y) dc->min_y=y+h1;
      if (y+h2-1>dc->max_y) dc->max_y=y+h2-1;
    }
    if (dc->flags & DCF_DONT_DRAW)
      return TRUE;
    color=dc->color;
    if (color.c1.rop&(ROPBF_DITHER|ROPBF_PROBABILITY_DITHER)) {
      dither=TRUE;
      if (color.c1.rop&ROPBF_PROBABILITY_DITHER) {
	probability_dither=TRUE;
	color.c1.rop=color.c0.rop;
	dither_colors=color;
      } else {
	probability_dither=FALSE;
	color.c1.rop=color.c0.rop;
      }
    } else
      dither=FALSE;
    original_leading_pixels=leading_pixels=-(w1+x)&7;
    leading_pixel_mask=gr.to_8_bits[0xFF>>leading_pixels];
    whole_I64s=(w2-w1-leading_pixels)>>3;
    if (whole_I64s<0) whole_I64s=0;
    trailing_pixels=(x+w2)&7;
    trailing_pixel_mask=gr.to_8_bits[0xFF<<trailing_pixels&0xFF];
    if (leading_pixels+trailing_pixels>w2-w1) {
      leading_pixel_mask|=trailing_pixel_mask;
      leading_pixels=w2-w1; //Correct so it's right for res.
      trailing_pixels=0;
    }
    if (color.c0.rop==ROPB_COLLISION) {//TODO: Might want to check win_z_buf
      color=dc->bkcolor.c0.color;
      k1=(h1+y)*dc->width_internal+x;
      res=-dc->collision_cnt;
      for (j=h2-h1;j;j--) {
	for (i=w1;i<w2;i++) {
	  c=dc->body[k1+i];
	  if (c!=TRANSPARENT && c!=color)
	    dc->collision_cnt++;
	}
	k1+=dc->width_internal;
      }
      res+=dc->collision_cnt;
    } else {
      if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP)
	win_z_buf_ptr=NULL;
      else {
	win_z_num=win_task->win_z_num;
	win_z_buf_ptr=gr.win_z_buf(U8 *)+((h1+y)/FONT_HEIGHT*TEXT_COLS+
	      (w1+x)/FONT_WIDTH)*sizeof(U16);
	win_z_buf_line_dec=whole_I64s;
	if (leading_pixels)
	  win_z_buf_line_dec++;
	if (trailing_pixels)
	  win_z_buf_line_dec++;
	win_z_buf_line_dec*=sizeof(U16);
	win_z_buf_line_inc=TEXT_COLS*sizeof(U16)-win_z_buf_line_dec;
      }
      kk1=(h1+y)*dc->width_internal+x+w1;
      if (dither) {
	if (probability_dither) {
	  if (RandU16<dc->dither_probability_u16)
	    color.c0=dither_colors.c1;
	  else
	    color.c0=dither_colors.c0;
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      if (win_z_buf_ptr) {
		res=0;
		for (j=h1;j<h2;j++) {
		  color_mask=gr.to_8_colors[color.c0.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels) {
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			    color_mask&~leading_pixel_mask;
		      res+=leading_pixels;
		    }
		    dst(I64 *)++;
		  }
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=color_mask;
		      res+=8;
		    }
		  if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  color_mask&~trailing_pixel_mask;
		    res+=trailing_pixels;
		  }
		  if ((j+y)&7==7)
		    win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		  else
		    win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		  kk1+=dc->width_internal;
		  if (RandU16<dc->dither_probability_u16)
		    color.c0=dither_colors.c1;
		  else
		    color.c0=dither_colors.c0;
		}
	      } else {
		for (j=h2-h1;j;j--) {
		  color_mask=gr.to_8_colors[color.c0.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  color_mask&~leading_pixel_mask;
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    *dst(I64 *)=color_mask;
		  if (trailing_pixels)
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  color_mask&~trailing_pixel_mask;
		  kk1+=dc->width_internal;
		  if (RandU16<dc->dither_probability_u16)
		    color.c0=dither_colors.c1;
		  else
		    color.c0=dither_colors.c0;
		}
		res=(h2-h1)*(w2-w1);
	      }
	      break;
	    case ROPB_XOR:
	      if (win_z_buf_ptr) {
		res=0;
		for (j=h1;j<h2;j++) {
		  color_mask=gr.to_8_colors[color.c0.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels) {
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			    *dst(I64 *)^color_mask&~leading_pixel_mask;
		      res+=leading_pixels;
		    }
		    dst(I64 *)++;
		  }
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)^=color_mask;
		      res+=8;
		    }
		  if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  *dst(I64 *)^color_mask&~trailing_pixel_mask;
		    res+=trailing_pixels;
		  }
		  if ((j+y)&7==7)
		    win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		  else
		    win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		  kk1+=dc->width_internal;
		  if (RandU16<dc->dither_probability_u16)
		    color.c0=dither_colors.c1;
		  else
		    color.c0=dither_colors.c0;
		}
	      } else {
		for (j=h2-h1;j;j--) {
		  color_mask=gr.to_8_colors[color.c0.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  *dst(I64 *)^color_mask&~leading_pixel_mask;
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    *dst(I64 *)^=color_mask;
		  if (trailing_pixels)
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  *dst(I64 *)^color_mask&~trailing_pixel_mask;
		  kk1+=dc->width_internal;
		  if (RandU16<dc->dither_probability_u16)
		    color.c0=dither_colors.c1;
		  else
		    color.c0=dither_colors.c0;
		}
		res=(h2-h1)*(w2-w1);
	      }
	      break;
	  }
	} else {
	  if (((x+w1-original_leading_pixels)^(y+h1))&1)
	    SwapU16(&color.c0,&color.c1);
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      if (win_z_buf_ptr) {
		res=0;
		for (j=h1;j<h2;j++) {
		  color_mask=gr.to_8_bits[0x55]&gr.to_8_colors[color.c0.color]|
			gr.to_8_bits[0xAA]&gr.to_8_colors[color.c1.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels) {
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			    color_mask&~leading_pixel_mask;
		      res+=leading_pixels;
		    }
		    dst(I64 *)++;
		  }
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=color_mask;
		      res+=8;
		    }
		  if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  color_mask&~trailing_pixel_mask;
		    res+=trailing_pixels;
		  }
		  if ((j+y)&7==7)
		    win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		  else
		    win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		  kk1+=dc->width_internal;
		  SwapU16(&color.c0,&color.c1);
		}
	      } else {
		for (j=h2-h1;j;j--) {
		  color_mask=gr.to_8_bits[0x55]&gr.to_8_colors[color.c0.color]|
			gr.to_8_bits[0xAA]&gr.to_8_colors[color.c1.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  color_mask&~leading_pixel_mask;
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    *dst(I64 *)=color_mask;
		  if (trailing_pixels)
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  color_mask&~trailing_pixel_mask;
		  kk1+=dc->width_internal;
		  SwapU16(&color.c0,&color.c1);
		}
		res=(h2-h1)*(w2-w1);
	      }
	      break;
	    case ROPB_XOR:
	      if (win_z_buf_ptr) {
		res=0;
		for (j=h1;j<h2;j++) {
		  color_mask=gr.to_8_bits[0x55]&gr.to_8_colors[color.c0.color]|
			gr.to_8_bits[0xAA]&gr.to_8_colors[color.c1.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels) {
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			    *dst(I64 *)^color_mask&~leading_pixel_mask;
		      res+=leading_pixels;
		    }
		    dst(I64 *)++;
		  }
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    if (win_z_num>=*win_z_buf_ptr++) {
		      *dst(I64 *)^=color_mask;
		      res+=8;
		    }
		  if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  *dst(I64 *)^color_mask&~trailing_pixel_mask;
		    res+=trailing_pixels;
		  }
		  if ((j+y)&7==7)
		    win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		  else
		    win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		  kk1+=dc->width_internal;
		  SwapU16(&color.c0,&color.c1);
		}
	      } else {
		for (j=h2-h1;j;j--) {
		  color_mask=gr.to_8_bits[0x55]&gr.to_8_colors[color.c0.color]|
			gr.to_8_bits[0xAA]&gr.to_8_colors[color.c1.color];
		  dst=dc->body+kk1&~7;
		  if (leading_pixels)
		    *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			  *dst(I64 *)^color_mask&~leading_pixel_mask;
		  for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		    *dst(I64 *)^=color_mask;
		  if (trailing_pixels)
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  *dst(I64 *)^color_mask&~trailing_pixel_mask;
		  kk1+=dc->width_internal;
		  SwapU16(&color.c0,&color.c1);
		}
		res=(h2-h1)*(w2-w1);
	      }
	      break;
	  }
	}
      } else {
	color_mask=gr.to_8_colors[color.c0.color];
	switch [color.c0.rop] {
	  case ROPB_EQU:
	  case ROPB_MONO:
	    if (win_z_buf_ptr) {
	      res=0;
	      for (j=h1;j<h2;j++) {
		dst=dc->body+kk1&~7;
		if (leading_pixels) {
		  if (win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			  color_mask&~leading_pixel_mask;
		    res+=leading_pixels;
		  }
		  dst(I64 *)++;
		}
		for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		  if (win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=color_mask;
		    res+=8;
		  }
		if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			color_mask&~trailing_pixel_mask;
		  res+=trailing_pixels;
		}
		if ((j+y)&7==7)
		  win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		else
		  win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		kk1+=dc->width_internal;
	      }
	    } else {
	      for (j=h2-h1;j;j--) {
		dst(I64 *)=dc->body+kk1&~7;
		if (leading_pixels)
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			color_mask&~leading_pixel_mask;
		for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		  *dst(I64 *)=color_mask;
		if (trailing_pixels)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			color_mask&~trailing_pixel_mask;
		kk1+=dc->width_internal;
	      }
	      res=(h2-h1)*(w2-w1);
	    }
	    break;
	  case ROPB_XOR:
	    if (win_z_buf_ptr) {
	      res=0;
	      for (j=h1;j<h2;j++) {
		dst=dc->body+kk1&~7;
		if (leading_pixels) {
		  if (win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			  *dst(I64 *)^color_mask&~leading_pixel_mask;
		    res+=leading_pixels;
		  }
		  dst(I64 *)++;
		}
		for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		  if (win_z_num>=*win_z_buf_ptr++) {
		    *dst(I64 *)^=color_mask;
		    res+=8;
		  }
		if (trailing_pixels && win_z_num>=*win_z_buf_ptr++) {
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*dst(I64 *)^color_mask&~trailing_pixel_mask;
		  res+=trailing_pixels;
		}
		if ((j+y)&7==7)
		  win_z_buf_ptr(U8 *)+=win_z_buf_line_inc;
		else
		  win_z_buf_ptr(U8 *)-=win_z_buf_line_dec;
		kk1+=dc->width_internal;
	      }
	    } else {
	      for (j=h2-h1;j;j--) {
		dst=dc->body+kk1&~7;
		if (leading_pixels)
		  *dst(I64 *)++=*dst(I64 *)&leading_pixel_mask|
			*dst(I64 *)^color_mask&~leading_pixel_mask;
		for (i=0;i<whole_I64s;i++,dst(I64 *)++)
		  *dst(I64 *)^=color_mask;
		if (trailing_pixels)
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			*dst(I64 *)^color_mask&~trailing_pixel_mask;
		kk1+=dc->width_internal;
	      }
	      res=(h2-h1)*(w2-w1);
	    }
	    break;
	}
      }
    }
  }
  return res;
}

public I64 __GrPutChar(CDC *dc=gr.dc,I64 x,I64 y,U8 ch)
{//2D. Clipping but not transformation.
  U8 reg *src,reg *dst,*font_ptr;
  I64 i,m,leading_pixels,trailing_pixels,leading_pixel_mask,trailing_pixel_mask,
	j,k1,kk1,w1,h1,w2,h2,reg bit_shift,reg color_mask,dist;
  CColorROPU32 color,c;
  CTask *win_task;

  if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->scroll_x;
    y+=win_task->scroll_y;
  }

  if (x<0)
    w1=-x;
  else
    w1=0;
  if (y<0)
    h1=-y;
  else
    h1=0;
  w2=FONT_WIDTH;
  h2=FONT_HEIGHT;

  if (dc->flags & DCF_SCRN_BITMAP) {
    x+=win_task->pix_left;
    y+=win_task->pix_top;
  }
  if (dc->flags & DCF_LOCATE_NEAREST) {
    dist=DistSqrI64(x+w2>>1,y+h2>>1,dc->cur_x,dc->cur_y);
    if (dist<=dc->nearest_dist)
      dc->nearest_dist=dist;
  }
  if (dc->flags & DCF_SCRN_BITMAP) {
    if (x+w1<0) w1=-x;
    if (x+w2>win_task->pix_right+1)
      w2=win_task->pix_right+1-x;

    if (y+h1<0) h1=-y;
    if (y+h2>win_task->pix_bottom+1)
      h2=win_task->pix_bottom+1-y;
  }
  if (x+w2>dc->width)
    w2=dc->width-x;
  if (y+h2>dc->height)
    h2=dc->height-y;
  if (w1<w2<=FONT_WIDTH && h1<h2<=FONT_HEIGHT) {
    if (dc->flags & DCF_RECORD_EXTENTS) {
      if (x+w1	<dc->min_x) dc->min_x=x+w1;
      if (x+w2-1>dc->max_x) dc->max_x=x+w2-1;
      if (y+h1	<dc->min_y) dc->min_y=y+h1;
      if (y+h2-1>dc->max_y) dc->max_y=y+h2-1;
    }
    if (dc->flags & DCF_DONT_DRAW)
      return 1;
    color=dc->color;
    leading_pixels=-(w1+x)&7;
    if (!leading_pixels) leading_pixels=8;
    leading_pixel_mask=gr.to_8_bits[0xFF>>leading_pixels];
    bit_shift=-x&7;
    trailing_pixels=(x+w2)&7;
    trailing_pixel_mask=gr.to_8_bits[0xFF<<trailing_pixels&0xFF];
    if (leading_pixels+trailing_pixels>w2-w1) {
      leading_pixel_mask|=trailing_pixel_mask;
      trailing_pixels=0;
    }
    font_ptr=&__gr_font(U8 *)[FONT_HEIGHT*ch+h1];
    if (color.c0.rop==ROPB_COLLISION) {
      m=w1&(FONT_WIDTH-1);
#assert FONT_WIDTH==8
      color=dc->bkcolor.c0.color;
      for (i=w1;i<w2;i++,m++) {
	k1=(h1+y)*dc->width_internal+x;
	src=font_ptr;
	for (j=h2-h1;j;j--) {
	  c=dc->body[k1+i];
	  if (c!=TRANSPARENT && c!=color && Bt(src,m))
	    dc->collision_cnt++;
	  k1+=dc->width_internal;
	  src++;
	}
      }
    } else {
      color_mask=gr.to_8_colors[color.c0.color];
      k1=x+w1;
      kk1=(h1+y)*dc->width_internal+k1;
      if (!(dc->flags & DCF_SCRN_BITMAP) || dc->flags&DCF_ON_TOP) {
	if (leading_pixels) {
	  dst=dc->body+kk1&~7;
	  src=font_ptr;
	  if (bit_shift)
	    src--;
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      for (j=h2-h1;j;j--) {
		m=gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF];
		*dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
		      (color_mask&m|*dst(I64 *)&~m)&~leading_pixel_mask;
		src++;
		dst+=dc->width_internal;
	      }
	      break;
	    case ROPB_XOR:
	      if (color_mask) {
		for (j=h2-h1;j;j--) {
		  *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			(*dst(I64 *)^gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF])&
			~leading_pixel_mask;
		  src++;
		  dst+=dc->width_internal;
		}
	      }
	      break;
	  }
	  kk1+=8;
	}
	if (trailing_pixels) {
	  dst=dc->body+kk1&~7;
	  src=font_ptr+1;
	  if (bit_shift)
	    src--;
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      for (j=h2-h1;j;j--) {
		m=gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF];
		*dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
		      (color_mask&m|*dst(I64 *)&~m)&~trailing_pixel_mask;
		src++;
		dst+=dc->width_internal;
	      }
	      break;
	    case ROPB_XOR:
	      if (color_mask)
		for (j=h2-h1;j;j--) {
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(*dst(I64 *)^gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF])&
			~trailing_pixel_mask;
		  src++;
		  dst+=dc->width_internal;
		}
	      break;
	  }
	}
      } else {
	if (leading_pixels) {
	  dst=dc->body+kk1&~7;
	  src=font_ptr;
	  if (bit_shift)
	    src--;
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      for (j=h1;j<h2;j++) {
		if (!IsPixCovered0(win_task,k1,y+j)) {
		  m=gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF];
		  *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			(color_mask&m|*dst(I64 *)&~m)&~leading_pixel_mask;
		}
		src++;
		dst+=dc->width_internal;
	      }
	      break;
	    case ROPB_XOR:
	      if (color_mask)
		for (j=h1;j<h2;j++) {
		  if (!IsPixCovered0(win_task,k1,y+j))
		    *dst(I64 *)=*dst(I64 *)&leading_pixel_mask|
			  (*dst(I64 *)^gr.to_8_bits
			  [*src(U16 *)>>bit_shift&0xFF])&
			  ~leading_pixel_mask;
		  src++;
		  dst+=dc->width_internal;
		}
	      break;
	  }
	  k1+=8;
	  kk1+=8;
	}
	if (trailing_pixels) {
	  dst=dc->body+kk1&~7;
	  src=font_ptr+1;
	  if (bit_shift)
	    src--;
	  switch [color.c0.rop] {
	    case ROPB_EQU:
	    case ROPB_MONO:
	      for (j=h1;j<h2;j++) {
		if (!IsPixCovered0(win_task,k1,y+j)) {
		  m=gr.to_8_bits[*src(U16 *)>>bit_shift&0xFF];
		  *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			(color_mask&m|*dst(I64 *)&~m)&~trailing_pixel_mask;
		}
		src++;
		dst+=dc->width_internal;
	      }
	      break;
	    case ROPB_XOR:
	      if (color_mask)
		for (j=h1;j<h2;j++) {
		  if (!IsPixCovered0(win_task,k1,y+j))
		    *dst(I64 *)=*dst(I64 *)&trailing_pixel_mask|
			  (*dst(I64 *)^gr.to_8_bits
			  [*src(U16 *)>>bit_shift&0xFF])&
			  ~trailing_pixel_mask;
		  src++;
		  dst+=dc->width_internal;
		}
	      break;
	  }
	}
      }
    }
    return 1;
  } else
    return 0;
}

I64 GrPutS(CDC *dc=gr.dc,I64 x,I64 y,U8 *_s)
{//Use $LK,"GrPrint",A="MN:GrPrint"$()
  I64 x0,sx=0,sy=0,res;
  if (!_s) return 0;
  x0=x;
  res=0;
  while (*_s) {
    if (*_s=='\n') {
      x=x0;
      y+=FONT_HEIGHT;
      _s++;
    } else if (*_s=='\t') {
      x=x0+CeilU64(x-x0+FONT_WIDTH,8*FONT_WIDTH);
      _s++;
    } else if (*_s(U32 *)=='$$SY,') {
      if (_s[4]=='-') {
	_s++;
	sy='0'-_s[4];
      } else
	sy=_s[4]-'0';
      _s+=6;
    } else if (*_s(U32 *)=='$$SX,') {
      if (_s[4]=='-') {
	_s++;
	sx='0'-_s[4];
      } else
	sx=_s[4]-'0';
      _s+=6;
    } else {
      res+=GrPutChar(dc,x+sx,y+sy,*_s);
      x+=FONT_WIDTH;
      _s++;
    }
  }
  return res;
}

public Bool GrClamp(CDC *dc=gr.dc,I64 *left,I64 *top,I64 *right,I64 *bottom,
	I64 width=0,I64 height=0)
{//Returns scrn, not window coordinates.
  CTask *win_task;
  *left=0;
  *top=0;
  *right=dc->width-1;
  *bottom=dc->height-1;
  if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    if (GR_WIDTH-1<*right)
      *right=GR_WIDTH-1;
    if (GR_HEIGHT-1<*bottom)
      *bottom=GR_HEIGHT-1;
    if (win_task->pix_left>*left)
      *left=win_task->pix_left;
    if (win_task->pix_top>*top)
      *top=win_task->pix_top;
    if (win_task->pix_right<*right)
      *right=win_task->pix_right;
    if (win_task->pix_bottom<*bottom)
      *bottom=win_task->pix_bottom;
  }
  *left-=width;
  *right+=width;
  *top-=height;
  *bottom+=height;
  return *left<=*right && *top<=*bottom;
}

Bool DCClipLine(CDC *dc=gr.dc,I64 *x1,I64 *y1,I64 *x2,I64 *y2,
	I64 width=0,I64 height=0)
{//Also converts window to scrn coordinates
  I64 left,top,right,bottom;
  CTask *win_task;
  if (GrClamp(dc,&left,&top,&right,&bottom,width,height)) {
    if (dc->flags & DCF_SCRN_BITMAP) {
      win_task=dc->win_task;
      *x1+=win_task->pix_left+win_task->scroll_x;
      *y1+=win_task->pix_top+win_task->scroll_y;
      *x2+=win_task->pix_left+win_task->scroll_x;
      *y2+=win_task->pix_top+win_task->scroll_y;
    }
    return ClipLine(x1,y1,x2,y2,left,top,right,bottom);
  } else
    return FALSE;
}

public Bool GrPlot(CDC *dc=gr.dc,I64 x,I64 y)
{//2D. Clipping but No transformation or thick.
  I32 *db=dc->depth_buf;
  CTask *win_task;
  CColorROPU32 old_color;
  dc->depth_buf=NULL;
  if (dc->brush) {
    old_color=dc->color;
    if (dc->color.c0.rop!=ROPB_COLLISION)
      dc->color.c0.rop=ROPB_MONO;
    GrBlot(dc,x,y,dc->brush);
    dc->color=old_color;
  } else if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->pix_left+win_task->scroll_x;
    y+=win_task->pix_top+win_task->scroll_y;
    if (win_task->pix_left<=x<=win_task->pix_right &&
	  win_task->pix_top<=y<=win_task->pix_bottom &&
	  0<=x<dc->width && 0<=y<dc->height &&
	  (win_task->next_task==sys_winmgr_task ||
	  dc->flags&DCF_ON_TOP ||
	  !IsPixCovered0(win_task,x,y)))
      GrPlot0(dc,x,y);
  } else
    if (0<=x<dc->width && 0<=y<dc->height)
      GrPlot0(dc,x,y);
  dc->depth_buf=db;
  return TRUE;
}

Bool GrPlot1(CDC *dc=gr.dc,I64 x,I64 y)
{//Clipping but No transformation or thick, called with db_z set
  CTask *win_task;
  CColorROPU32 old_color;
  if (dc->brush) {
    old_color=dc->color;
    if (dc->color.c0.rop!=ROPB_COLLISION)
      dc->color.c0.rop=ROPB_MONO;
    if (dc->depth_buf)
      throw('Graphics',TRUE);
    else
      GrBlot(dc,x,y,dc->brush);
    dc->color=old_color;
  } else if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->pix_left+win_task->scroll_x;
    y+=win_task->pix_top+win_task->scroll_y;
    if (win_task->pix_left<=x<=win_task->pix_right &&
	  win_task->pix_top <=y<=win_task->pix_bottom &&
	  0<=x<dc->width && 0<=y<dc->height &&
	  (win_task->next_task==sys_winmgr_task ||
	  dc->flags&DCF_ON_TOP ||
	  !IsPixCovered0(win_task,x,y)))
      GrPlot0(dc,x,y);
  } else
    if (0<=x<dc->width && 0<=y<dc->height)
      GrPlot0(dc,x,y);
  return TRUE;
}

public I64 GrPeek(CDC *dc=gr.dc,I64 x,I64 y)
{//2D. Clipping but no transformation.
//Returns pix color or -1 if off-scrn or covered.
  CTask *win_task;
  if (dc->flags & DCF_SCRN_BITMAP) {
    win_task=dc->win_task;
    x+=win_task->pix_left+win_task->scroll_x;
    y+=win_task->pix_top+win_task->scroll_y;
    if (!(win_task->pix_left<=x<=win_task->pix_right)  ||
	  !(win_task->pix_top <=y<=win_task->pix_bottom) ||
	  !(0<=x<dc->width) || !(0<=y<dc->height) ||
	  win_task->next_task!=sys_winmgr_task &&
	  !(dc->flags&DCF_ON_TOP) &&
	  IsPixCovered0(win_task,x,y))
      return -1;
  } else
    if (!(0<=x<dc->width) || !(0<=y<dc->height))
      return -1;
  return GrPeek0(dc,x,y);
}

Bool GrLinePlot0(CDC *dc,I64 x,I64 y,I64 z)
{//This is a callback.
  CTask *win_task=dc->win_task;
  if (!(dc->flags & DCF_SCRN_BITMAP) ||
	win_task->next_task==sys_winmgr_task ||
	dc->flags&DCF_ON_TOP ||
	!IsPixCovered0(win_task,x,y)) {
    dc->db_z=z;
    GrPlot0(dc,x,y);
  }
  return TRUE;
}

Bool GrLinePlot(CDC *dc,I64 x,I64 y,I64 z)
{//This is a callback.
  dc->db_z=z;
  GrPlot1(dc,x,y);
  return TRUE;
}

public Bool GrLine(CDC *dc=gr.dc,I64 x1,I64 y1,I64 x2,I64 y2,
	I64 step=1,I64 start=0)
{//2D. Clipping but not transformation.
  Bool res=FALSE;
  I32 *db=dc->depth_buf;
  dc->depth_buf=NULL;
  if (step==1 && !start && !dc->brush && !dc->depth_buf) {
    if (DCClipLine(dc,&x1,&y1,&x2,&y2))
      res=Line(dc,x1,y1,0,x2,y2,0,&GrLinePlot0,step,start);
  } else
    res=Line(dc,x1,y1,0,x2,y2,0,&GrLinePlot,step,start);
  dc->depth_buf=db;
  return res;
}

public Bool GrCircle(CDC *dc=gr.dc,I64 cx,I64 cy,I64 radius,
  I64 step=1,F64 start_radians=0,F64 len_radians=2*π)
{//2D. Clipping but not transformation.
  Bool res;
  I32 *db=dc->depth_buf;
  dc->depth_buf=NULL;
  res=Circle(dc,cx,cy,0,radius,&GrLinePlot,step,start_radians,len_radians);
  dc->depth_buf=db;
  return res;
}
`;
