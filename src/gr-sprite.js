//Native V5.03 sprite record layouts from Adam/Gr/Gr.HH.
export const SPRITE_TYPES_SRC=String.raw`

class CMeshTri
{
  I32 color;	//Give one of 0-7 colors.
//Colors 8-15 are 0-7 with intensity bit set.
  I32 nums[3];	//Vertex number
};

class CQueMeshTri
{
  CQueMeshTri *next,*last;
  U0 start;
  I32 color;
  I32 nums[3];
};

public class CSpriteBase
{
  U8 type;
};

public class CSpriteColor : CSpriteBase
{
  U8 color;
};

public class CSpriteDitherColor : CSpriteBase
{
  U16 dither_color;
};

public class CSpriteT : CSpriteBase
{
  I32 thick;
};

public class CSpritePt : CSpriteBase
{
  I32 x1;
  I32 y1;
};

public class CSpritePtRad : CSpritePt
{
  I32 radius;
};

public class CSpritePtPt : CSpritePt
{
  I32 x2;
  I32 y2;
};

public class CSpritePtPtAng : CSpritePtPt
{
  F64 angle;
};

public class CSpritePtWH : CSpritePt
{
  I32 width;
  I32 height;
};

public class CSpritePtWHU8s : CSpritePtWH
{
  U8 u[0];
};

public class CSpritePtWHAng : CSpritePtWH
{
  F64 angle;
};

public class CSpritePtWHAngSides : CSpritePtWHAng
{
  I32 sides;
};

public class CSpriteNumU8s : CSpriteBase
{
  I32 num;
  U8  u[0];
};

public class CSpriteNumPtU8s : CSpriteBase
{
  I32 num;
  I32 x;
  I32 y;
  U8  u[0];
};

public class CSpritePtStr : CSpritePt
{
  U8  st[0];
};

public class CSpriteMeshU8s : CSpriteBase
{
  I32 vertex_cnt;
  I32 tri_cnt;
  U8  u[0];
};

public class CSpritePtMeshU8s : CSpriteBase
{
  I32 x;
  I32 y;
  I32 z;
  I32 vertex_cnt;
  I32 tri_cnt;
  U8  u[0];
};

#define SPF_SEL			128
#define SPf_SEL			7

#define SPT_END			0	//$LK,"CSpriteBase",A="MN:CSpriteBase"$
#define SPT_COLOR		1	//$LK,"CSpriteColor",A="MN:CSpriteColor"$
#define SPT_DITHER_COLOR	2	//$LK,"CSpriteDitherColor",A="MN:CSpriteDitherColor"$
#define SPT_THICK		3	//$LK,"CSpriteT",A="MN:CSpriteT"$
#define SPT_PLANAR_SYMMETRY	4	//$LK,"CSpritePtPt",A="MN:CSpritePtPt"$
#define SPT_TRANSFORM_ON	5	//$LK,"CSpriteBase",A="MN:CSpriteBase"$
#define SPT_TRANSFORM_OFF	6	//$LK,"CSpriteBase",A="MN:CSpriteBase"$
#define SPT_SHIFT		7	//$LK,"CSpritePt",A="MN:CSpritePt"$
#define SPT_PT			8	//$LK,"CSpritePt",A="MN:CSpritePt"$
#define SPT_POLYPT		9	//$LK,"CSpriteNumPtU8s",A="MN:CSpriteNumPtU8s"$
#define SPT_LINE		10	//$LK,"CSpritePtPt",A="MN:CSpritePtPt"$
#define SPT_POLYLINE		11	//$LK,"CSpriteNumU8s",A="MN:CSpriteNumU8s"$
#define SPT_RECT		12	//$LK,"CSpritePtPt",A="MN:CSpritePtPt"$
#define SPT_ROTATED_RECT	13	//$LK,"CSpritePtPtAng",A="MN:CSpritePtPtAng"$
#define SPT_CIRCLE		14	//$LK,"CSpritePtRad",A="MN:CSpritePtRad"$
#define SPT_ELLIPSE		15	//$LK,"CSpritePtWHAng",A="MN:CSpritePtWHAng"$
#define SPT_POLYGON		16	//$LK,"CSpritePtWHAngSides",A="MN:CSpritePtWHAngSides"$
#define SPT_BSPLINE2		17	//$LK,"CSpriteNumU8s",A="MN:CSpriteNumU8s"$
#define SPT_BSPLINE2_CLOSED	18	//$LK,"CSpriteNumU8s",A="MN:CSpriteNumU8s"$
#define SPT_BSPLINE3		19	//$LK,"CSpriteNumU8s",A="MN:CSpriteNumU8s"$
#define SPT_BSPLINE3_CLOSED	20	//$LK,"CSpriteNumU8s",A="MN:CSpriteNumU8s"$
#define SPT_FLOOD_FILL		21	//$LK,"CSpritePt",A="MN:CSpritePt"$
#define SPT_FLOOD_FILL_NOT	22	//$LK,"CSpritePt",A="MN:CSpritePt"$
#define SPT_BITMAP		23	//$LK,"CSpritePtWHU8s",A="MN:CSpritePtWHU8s"$
#define SPT_MESH		24	//$LK,"CSpriteMeshU8s",A="MN:CSpriteMeshU8s"$ See $MA-X+PU,"::/Apps/GrModels",LM="Cd(\"::/Apps/GrModels\");Dir;View;\n"$.
#define SPT_SHIFTABLE_MESH	25	//$LK,"CSpritePtMeshU8s",A="MN:CSpritePtMeshU8s"$ See $MA-X+PU,"::/Apps/GrModels",LM="Cd(\"::/Apps/GrModels\");Dir;View;\n"$.
#define SPT_ARROW		26	//$LK,"CSpritePtPt",A="MN:CSpritePtPt"$
#define SPT_TEXT		27	//$LK,"CSpritePtStr",A="MN:CSpritePtStr"$
#define SPT_TEXT_BOX		28	//$LK,"CSpritePtStr",A="MN:CSpritePtStr"$
#define SPT_TEXT_DIAMOND	29	//$LK,"CSpritePtStr",A="MN:CSpritePtStr"$
#define SPT_TYPES_NUM		30
#define SPG_TYPE_MASK		0x7F


//See $LK,"Sprites",A="HI:Sprites"$.  See $LK,"::/Adam/Gr/GrSpritePlot.HC",A="FL:::/Adam/Gr/GrSpritePlot.HC,1"$ and
//$LK,"::/Demo/Graphics/SpriteRaw.HC"$ for how CSprite are stored.
public class CSprite
{
  CSprite *next,*last;
  U0 start;
  union {
    U8 type;
    CSpriteBase		b;
    CSpriteColor	c;
    CSpriteDitherColor	d;
    CSpriteT		t;
    CSpritePt		p;
    CSpritePtPt		pp;
    CSpritePtPtAng	ppa;
    CSpritePtRad	pr;
    CSpritePtWHU8s	pwhu;
    CSpritePtWHAng	pwha;
    CSpritePtWHAngSides pwhas;
    CSpriteNumU8s	nu;
    CSpriteNumPtU8s	npu;
    CSpriteMeshU8s	mu;
    CSpritePtMeshU8s	pmu;
    CSpritePtStr	ps;
  }
};
`;

export const SPRITE_SRC=String.raw`
I64 sprite_elem_base_sizes[SPT_TYPES_NUM]={
  sizeof(CSpriteBase),		//SPT_END
  sizeof(CSpriteColor),		//SPT_COLOR
  sizeof(CSpriteDitherColor),	//SPT_DITHER_COLOR
  sizeof(CSpriteT),		//SPT_THICK
  sizeof(CSpritePtPt),		//SPT_PLANAR_SYMMETRY
  sizeof(CSpriteBase),		//SPT_TRANSFORM_ON
  sizeof(CSpriteBase),		//SPT_TRANSFORM_OFF
  sizeof(CSpritePt),		//SPT_SHIFT
  sizeof(CSpritePt),		//SPT_PT
  sizeof(CSpriteNumPtU8s),	//SPT_POLYPT
  sizeof(CSpritePtPt),		//SPT_LINE
  sizeof(CSpriteNumU8s),	//SPT_POLYLINE
  sizeof(CSpritePtPt),		//SPT_RECT
  sizeof(CSpritePtPtAng),	//SPT_ROTATED_RECT
  sizeof(CSpritePtRad),		//SPT_CIRCLE
  sizeof(CSpritePtWHAng),	//SPT_ELLIPSE
  sizeof(CSpritePtWHAngSides),	//SPT_POLYGON
  sizeof(CSpriteNumU8s),	//SPT_BSPLINE2
  sizeof(CSpriteNumU8s),	//SPT_BSPLINE2_CLOSED
  sizeof(CSpriteNumU8s),	//SPT_BSPLINE3
  sizeof(CSpriteNumU8s),	//SPT_BSPLINE3_CLOSED
  sizeof(CSpritePt),		//SPT_FLOOD_FILL
  sizeof(CSpritePt),		//SPT_FLOOD_FILL_NOT
  sizeof(CSpritePtWHU8s),	//SPT_BITMAP
  sizeof(CSpriteMeshU8s),	//SPT_MESH
  sizeof(CSpritePtMeshU8s),	//SPT_SHIFTABLE_MESH
  sizeof(CSpritePtPt),		//SPT_ARROW
  sizeof(CSpritePtStr),		//SPT_TEXT
  sizeof(CSpritePtStr),		//SPT_TEXT_BOX
  sizeof(CSpritePtStr),		//SPT_TEXT_DIAMOND
};

I64 SpriteElemQuedBaseSize(I64 type)
{
  type&=SPG_TYPE_MASK;
  if (type>=SPT_TYPES_NUM) throw('Graphics');
  return sprite_elem_base_sizes[type]+offset(CSprite.start);
}

I64 SpriteElemSize(CSprite *tmpg)
{
  I64 type=tmpg->type&SPG_TYPE_MASK,i;
  if (type>=SPT_TYPES_NUM) throw('Graphics');
  i=sprite_elem_base_sizes[type];
  switch (tmpg->type&SPG_TYPE_MASK) {
    case SPT_POLYLINE:
      i+=tmpg->nu.num*sizeof(CD2I32);
      break;
    case SPT_TEXT:
    case SPT_TEXT_BOX:
    case SPT_TEXT_DIAMOND:
      i+=StrLen(tmpg->ps.st)+1;
      break;
    case SPT_BITMAP:
      i+=((tmpg->pwhu.width+7)&~7)*tmpg->pwhu.height;
      break;
    case SPT_POLYPT:
      i+=(tmpg->npu.num*3+7)>>3;
      break;
    case SPT_BSPLINE2:
    case SPT_BSPLINE3:
    case SPT_BSPLINE2_CLOSED:
    case SPT_BSPLINE3_CLOSED:
      i+=tmpg->nu.num*sizeof(CD3I32);
      break;
    case SPT_MESH:
      i+=tmpg->mu.vertex_cnt*sizeof(CD3I32)+
	    tmpg->mu.tri_cnt*sizeof(CMeshTri);
      break;
    case SPT_SHIFTABLE_MESH:
      i+=tmpg->pmu.vertex_cnt*sizeof(CD3I32)+
	    tmpg->pmu.tri_cnt*sizeof(CMeshTri);
      break;
  }
  return i;
}

public I64 SpriteSize(U8 *elems)
{//Walk sprite elements and return size of sprite as binary data.
  CSprite *tmpg=elems-offset(CSprite.start),*tmpg1=tmpg;
  while (tmpg->type&SPG_TYPE_MASK)
    tmpg(U8 *)+=SpriteElemSize(tmpg);
  return tmpg(U8 *)-tmpg1(U8 *)+sprite_elem_base_sizes[SPT_END];
}

I64 SpriteTypeMask(U8 *elems)
{
  I64 res=0;
  CSprite *tmpg=elems-offset(CSprite.start);
  while (tmpg->type&SPG_TYPE_MASK) {
    if (tmpg->type&SPG_TYPE_MASK>=SPT_TYPES_NUM)
      return 1<<SPT_TYPES_NUM;
    Bts(&res,tmpg->type&SPG_TYPE_MASK);
    tmpg(U8 *)+=SpriteElemSize(tmpg);
  }
  return res;
}

public U8 *DC2Sprite(CDC *tmpb)
{//Convert device context to sprite.
  CSprite *tmpg;
  tmpg=CAlloc(sprite_elem_base_sizes[SPT_BITMAP]+
	tmpb->width_internal*tmpb->height+
	sprite_elem_base_sizes[SPT_END])
  (U8 *)-offset(CSprite.start);
  tmpg->type=SPT_BITMAP;
  tmpg->pwhu.width=tmpb->width;
  tmpg->pwhu.height=tmpb->height;
  tmpg->pwhu.x1=0;
  tmpg->pwhu.y1=0;
  MemCpy(&tmpg->pwhu.u,tmpb->body,tmpb->width_internal*tmpb->height);
  return tmpg(U8 *)+offset(CSprite.start);
}

public U0 Sprite3(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems,
	Bool just_one_elem=FALSE)
{//Plot a sprite into a CDC.
  CSprite *tmpg=elems-offset(CSprite.start);
  I64 i,j,k,x1,y1,z1,x2,y2,
	old_flags=dc->flags,old_pen_width=dc->thick,
	*old_r=dc->r,*r2=NULL,*draw_r=NULL,old_r_norm=dc->r_norm,
	old_x=dc->x,old_y=dc->y,old_z=dc->z;
  I32 *ptr;
  CColorROPU32 old_color=dc->color;
  CDC *img=NULL;
  CD3I32 *p=NULL,*p2;
  CGrSym old_sym;
  MemCpy(&old_sym,&dc->sym,sizeof(CGrSym));
  if (dc->flags & DCF_LOCATE_NEAREST)
    dc->nearest_dist=I64_MAX;
  try {
    while (tmpg->type&SPG_TYPE_MASK) {
      switch (tmpg->type&SPG_TYPE_MASK) {
	case SPT_COLOR:
	  dc->color=dc->color&~(COLORROP_COLORS_MASK|ROPF_DITHER)|tmpg->c.color;
	  break;
	case SPT_DITHER_COLOR:
	  dc->color=dc->color&~COLORROP_COLORS_MASK|
		tmpg->d.dither_color.u8[0]|
		tmpg->d.dither_color.u8[1]<<COLORROP_BITS|ROPF_DITHER;
	  break;
	case SPT_THICK:
	  dc->thick=tmpg->t.thick;
	  DCThickScale(dc);
	  break;
	case SPT_TRANSFORM_ON:
	  if (!(dc->flags&DCF_TRANSFORMATION)) {
	    x-=dc->x;
	    y-=dc->y;
	    z-=dc->z;
	  }
	  dc->flags|=DCF_TRANSFORMATION;
	  break;
	case SPT_TRANSFORM_OFF:
	  if (dc->flags&DCF_TRANSFORMATION) {
	    x+=dc->x;
	    y+=dc->y;
	    z+=dc->z;
	  }
	  dc->flags&=~DCF_TRANSFORMATION;
	  break;
	case SPT_PT:
	  GrPlot3(dc,tmpg->p.x1+x,tmpg->p.y1+y,z);
	  break;
	case SPT_TEXT:
	  GrPrint3(dc,tmpg->ps.x1+x,tmpg->ps.y1+y,z,"%s",tmpg->ps.st);
	  break;
	case SPT_TEXT_BOX:
	  GrTextBox3(dc,tmpg->ps.x1+x,tmpg->ps.y1+y,z,tmpg->ps.st);
	  break;
	case SPT_TEXT_DIAMOND:
	  GrTextDiamond3(dc,tmpg->ps.x1+x,tmpg->ps.y1+y,z,tmpg->ps.st);
	  break;
	case SPT_FLOOD_FILL:
	  GrFloodFill3(dc,tmpg->p.x1+x,tmpg->p.y1+y,z,FALSE);
	  break;
	case SPT_FLOOD_FILL_NOT:
	  i=dc->color;
	  dc->color=dc->color.c0;
	  GrFloodFill3(dc,tmpg->p.x1+x,tmpg->p.y1+y,z,TRUE);
	  dc->color=i;
	  break;
	case SPT_SHIFT:
	  x+=tmpg->p.x1;
	  y+=tmpg->p.y1;
	  break;
	case SPT_LINE:
	  GrLine3(dc,tmpg->pp.x1+x,tmpg->pp.y1+y,z,
		tmpg->pp.x2+x,tmpg->pp.y2+y,z);
	  break;
	case SPT_ARROW:
	  GrArrow3(dc,tmpg->pp.x1+x,tmpg->pp.y1+y,z,
		tmpg->pp.x2+x,tmpg->pp.y2+y,z);
	  break;
	case SPT_PLANAR_SYMMETRY:
	  if (DCSymmetry3Set(dc,tmpg->pp.x1+x,tmpg->pp.y1+y,z,
		tmpg->pp.x2+x,tmpg->pp.y2+y,z,
		tmpg->pp.x2+x,tmpg->pp.y2+y,z+1))
	    dc->flags|=DCF_SYMMETRY;
	  else
	    dc->flags&=~DCF_SYMMETRY;
	  break;
	case SPT_BITMAP:
	  img=CAlloc(sizeof(CDC));
	  img->width=tmpg->pwhu.width;
	  img->width_internal=(tmpg->pwhu.width+7)&~7;
	  img->height=tmpg->pwhu.height;
	  img->body=&tmpg->pwhu.u;
	  img->dc_signature=DCS_SIGNATURE_VAL;
	  GrBlot3(dc,tmpg->pwhu.x1+x,tmpg->pwhu.y1+y,z,img);
	  Free(img);
	  img=NULL;
	  break;
	case SPT_RECT:
	  GrRect3(dc,tmpg->pp.x1+x,tmpg->pp.y1+y,z,
		tmpg->pp.x2-tmpg->pp.x1,tmpg->pp.y2-tmpg->pp.y1);
	  break;
	case SPT_ROTATED_RECT:
	  x1=tmpg->ppa.x1+x;
	  y1=tmpg->ppa.y1+y;
	  z1=z;
	  Mat4x4MulXYZ(dc->r,&x1,&y1,&z1);
	  old_r=dc->r;
	  dc->flags|=DCF_TRANSFORMATION;
	  r2=Mat4x4IdentNew;
	  Mat4x4RotZ(r2,-tmpg->ppa.angle);
	  Mat4x4TranslationEqu(r2,x1,y1,z1);
	  draw_r=Mat4x4MulMat4x4New(old_r,r2);
	  DCMat4x4Set(dc,draw_r);
	  GrRect3(dc,0,0,0,
		tmpg->ppa.x2-tmpg->ppa.x1,tmpg->ppa.y2-tmpg->ppa.y1);
	  Free(draw_r);
	  draw_r=NULL;
	  Free(r2);
	  r2=NULL;
	  DCMat4x4Set(dc,old_r);
	  dc->flags=dc->flags&~DCF_TRANSFORMATION|old_flags;
	  break;
	case SPT_CIRCLE:
	  GrCircle3(dc,tmpg->pr.x1+x,tmpg->pr.y1+y,z,tmpg->pr.radius);
	  break;
	case SPT_ELLIPSE:
	  GrEllipse3(dc,tmpg->pwha.x1+x,tmpg->pwha.y1+y,z,tmpg->pwha.width,
		tmpg->pwha.height,tmpg->pwha.angle);
	  break;
	case SPT_POLYGON:
	  GrRegPoly3(dc,tmpg->pwhas.x1+x,tmpg->pwhas.y1+y,z,tmpg->pwhas.width,
		tmpg->pwhas.height,tmpg->pwhas.sides,tmpg->pwhas.angle);
	  break;
	case SPT_POLYLINE:
	  ptr=&tmpg->nu.u;
	  x1=ptr[0];
	  y1=ptr[1];
	  for (i=1;i<tmpg->nu.num;i++) {
	    x2=ptr[i<<1];
	    y2=ptr[i<<1+1];
	    GrLine3(dc,x1+x,y1+y,z,x2+x,y2+y,z);
	    x1=x2;y1=y2;
	  }
	  break;
	case SPT_POLYPT:
	  x1=tmpg->npu.x;
	  y1=tmpg->npu.y;
	  ptr=&tmpg->npu.u;
	  k=tmpg->npu.num*3;
	  GrPlot3(dc,x1+x,y1+y,z);
	  for (i=0;i<k;i+=3) {
	    j=BFieldExtU32(ptr,i,3);
	    x1+=gr_x_offsets[j];
	    y1+=gr_y_offsets[j];
	    GrPlot3(dc,x1+x,y1+y,z);
	  }
	  break;
	start:
	  p2=p=MAlloc(tmpg->nu.num*sizeof(CD3I32));
	  MemCpy(p,&tmpg->nu.u,tmpg->nu.num*sizeof(CD3I32));
	  for (i=0;i<tmpg->nu.num;i++,p2++) {
	    p2->x+=x;
	    p2->y+=y;
	    p2->z+=z;
	  }
	  case SPT_BSPLINE2:
	    Gr2BSpline3(dc,p,tmpg->nu.num,FALSE);
	    break;
	  case SPT_BSPLINE3:
	    Gr3BSpline3(dc,p,tmpg->nu.num,FALSE);
	    break;
	  case SPT_BSPLINE2_CLOSED:
	    Gr2BSpline3(dc,p,tmpg->nu.num,TRUE);
	    break;
	  case SPT_BSPLINE3_CLOSED:
	    Gr3BSpline3(dc,p,tmpg->nu.num,TRUE);
	    break;
	end:
	  Free(p);
	  p=NULL;
	  break;
	case SPT_MESH:
	  p2=p=MAlloc(tmpg->mu.vertex_cnt*sizeof(CD3I32));
	  MemCpy(p,&tmpg->mu.u,tmpg->mu.vertex_cnt*sizeof(CD3I32));
	  for (i=0;i<tmpg->mu.vertex_cnt;i++,p2++) {
	    p2->x+=x;
	    p2->y+=y;
	    p2->z+=z;
	  }
	  Gr3Mesh(dc,tmpg->mu.vertex_cnt,p,tmpg->mu.tri_cnt,
		(&tmpg->mu.u)(U8 *)+sizeof(CD3I32)*tmpg->mu.vertex_cnt);
	  Free(p);
	  p=NULL;
	  break;
	case SPT_SHIFTABLE_MESH:
	  if (dc->flags&DCF_TRANSFORMATION) {
	    dc->x+=tmpg->pmu.x;
	    dc->y+=tmpg->pmu.y;
	    dc->z+=tmpg->pmu.z;
	    x1=x;
	    y1=y;
	    z1=z;
	  } else {
	    x1=tmpg->pmu.x+x;
	    y1=tmpg->pmu.y+y;
	    z1=tmpg->pmu.z+z;
	  }
	  p2=p=MAlloc(tmpg->pmu.vertex_cnt*sizeof(CD3I32));
	  MemCpy(p,&tmpg->pmu.u,tmpg->pmu.vertex_cnt*sizeof(CD3I32));
	  for (i=0;i<tmpg->pmu.vertex_cnt;i++,p2++) {
	    p2->x+=x1;
	    p2->y+=y1;
	    p2->z+=z1;
	  }
	  Gr3Mesh(dc,tmpg->pmu.vertex_cnt,p,tmpg->pmu.tri_cnt,
		(&tmpg->pmu.u)(U8 *)+sizeof(CD3I32)*tmpg->pmu.vertex_cnt);
	  Free(p);
	  p=NULL;
	  if (dc->flags&DCF_TRANSFORMATION) {
	    dc->x-=tmpg->pmu.x;
	    dc->y-=tmpg->pmu.y;
	    dc->z-=tmpg->pmu.z;
	  }
	  break;
	default:
	  throw('Graphics');
      }
      if (just_one_elem) break;
      tmpg(U8 *)+=SpriteElemSize(tmpg);
    }
  } catch {
    Free(img);
    Free(p);
    Free(draw_r);
    Free(r2);
    dc->r=old_r;dc->r_norm=old_r_norm;
    dc->x=old_x;dc->y=old_y;dc->z=old_z;
    MemCpy(&dc->sym,&old_sym,sizeof(CGrSym));
    dc->color=old_color;
    dc->thick=old_pen_width;
    dc->flags=old_flags;
  }
  MemCpy(&dc->sym,&old_sym,sizeof(CGrSym));
  dc->color=old_color;
  dc->thick=old_pen_width;
  dc->flags=dc->flags&~(DCF_SYMMETRY|DCF_TRANSFORMATION) |
	old_flags&(DCF_SYMMETRY|DCF_TRANSFORMATION);
}

public U0 Sprite3B(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems)
{//Plot a sprite into a CDC, post transform xyz translation.
  I64 old_x=dc->x,old_y=dc->y,old_z=dc->z,
	old_flags=dc->flags&DCF_TRANSFORMATION;
  dc->x=x; dc->y=y; dc->z=z;
  dc->flags|=DCF_TRANSFORMATION;
  try Sprite3(dc,0,0,0,elems);
  catch {
    dc->x=old_x;dc->y=old_y;dc->z=old_z;
    dc->flags=dc->flags&~DCF_TRANSFORMATION|old_flags;
  }
  dc->x=old_x; dc->y=old_y; dc->z=old_z;
  dc->flags=dc->flags&~DCF_TRANSFORMATION|old_flags;
}

public U0 Sprite3Mat4x4B(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems,I64 *m)
{//Plot rotated by matrix.
  I64 r[16],*old_r=dc->r,new_m[16],
	old_flags=dc->flags&DCF_TRANSFORMATION;
  MemCpy(new_m,m,16*sizeof(I64));
  dc->flags|=DCF_TRANSFORMATION;
  Mat4x4TranslationAdd(new_m,x,y,z);
  dc->r=Mat4x4MulMat4x4Equ(r,old_r,new_m);
  try Sprite3(dc,0,0,0,elems);
  catch {
    dc->r=old_r;
    dc->flags=dc->flags&~DCF_TRANSFORMATION|old_flags;
  }
  dc->r=old_r;
  dc->flags=dc->flags&~DCF_TRANSFORMATION|old_flags;
}

public U0 Sprite3XB(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems,F64 angle=0)
{//Plot rotated around X axis.
  I64 r[16];
  Mat4x4IdentEqu(r);
  Mat4x4RotX(r,angle);
  Sprite3Mat4x4B(dc,x,y,z,elems,r);
}

public U0 Sprite3YB(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems,F64 angle=0)
{//Plot rotated around Y axis.
  I64 r[16];
  Mat4x4IdentEqu(r);
  Mat4x4RotY(r,angle);
  Sprite3Mat4x4B(dc,x,y,z,elems,r);
}

public U0 Sprite3ZB(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 *elems,F64 angle=0)
{//Plot rotated around Z axis.
  I64 r[16];
  Mat4x4IdentEqu(r);
  Mat4x4RotZ(r,angle);
  Sprite3Mat4x4B(dc,x,y,z,elems,r);
}

public U0 SpriteExtents(U8 *elems,I64 *min_x=NULL,I64 *max_x=NULL,
	I64 *min_y=NULL,I64 *max_y=NULL)
{//Ignores flood fills.
  CDC *dc=DCNew(I32_MAX,I32_MAX,Fs,TRUE);
  DCExtentsInit(dc);
  try Sprite3(dc,I32_MAX/2,I32_MAX/2,I32_MAX/2,elems);
  catch DCDel(dc);
  if (dc->min_x<=dc->max_x) {
    dc->min_x-=I32_MAX/2;
    dc->max_x-=I32_MAX/2;
  }
  if (dc->min_y<=dc->max_y) {
    dc->min_y-=I32_MAX/2;
    dc->max_y-=I32_MAX/2;
  }
  if (min_x) *min_x=dc->min_x;
  if (max_x) *max_x=dc->max_x;
  if (min_y) *min_y=dc->min_y;
  if (max_y) *max_y=dc->max_y;
  DCDel(dc);
}

public CDC *Sprite2DC(U8 *elems)
{//Convert sprite to device context.
  CDC *res;
  I64 min_x,max_x,min_y,max_y;
  SpriteExtents(elems,&min_x,&max_x,&min_y,&max_y);
  res=DCNew(max_x-min_x+1,max_y-min_y+1);
  try Sprite3(res,-min_x,-min_y,0,elems);
  catch DCDel(res);
  return res;
}
`;
