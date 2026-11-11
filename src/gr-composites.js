//Native V5.03 composite drawing from Adam/Gr/GrComposites.HC.
export const GR_COMPOSITES_SRC=String.raw`
public Bool GrArrow3(CDC *dc=gr.dc,I64 x1,I64 y1,I64 z1,
	I64 x2,I64 y2,I64 z2,F64 w=2.75,I64 step=1,I64 start=0)
{//3D. Transformation with thick.
  I64 _x1,_y1,_z1,_x2,_y2,_z2,dx,dy;
  F64 d;
  Bool res=FALSE,was_transform=FALSE,was_symmetry=FALSE;
  if (dc->flags & DCF_TRANSFORMATION) {
    (*dc->transform)(dc,&x1,&y1,&z1);
    (*dc->transform)(dc,&x2,&y2,&z2);
    dc->flags&=~DCF_TRANSFORMATION;
    was_transform=TRUE;
  }
  if (dc->flags & DCF_SYMMETRY) {
    _x1=x1; _y1=y1; _z1=z1;
    DCReflect(dc,&_x1,&_y1,&_z1);
    _x2=x2; _y2=y2; _z2=z2;
    DCReflect(dc,&_x2,&_y2,&_z2);
    dc->flags&=~DCF_SYMMETRY;
    res=Line(dc,_x1,_y1,_z1,_x2,_y2,_z2,&GrPlot3,step,start);
    dx=_x2-_x1; dy=_y2-_y1;
    if (d=Sqrt(dx*dx+dy*dy)) {
      d=w*dc->thick/d;
      res|=Line(dc,_x2-dx*d+dy*d+0.5,_y2-dy*d-dx*d+0.5,_z2,
	    _x2,_y2,_z2,&GrPlot3,step);
      res|=Line(dc,_x2-dx*d-dy*d+0.5,_y2-dy*d+dx*d+0.5,_z2,
	    _x2,_y2,_z2,&GrPlot3,step);
    }
    was_symmetry=TRUE;
    if (dc->flags&DCF_JUST_MIRROR)
      goto gr_done;
  }
  res|=Line(dc,x1,y1,z1,x2,y2,z2,&GrPlot3,step,start);
  dx=x2-x1; dy=y2-y1;
  if (d=Sqrt(dx*dx+dy*dy)) {
    d=w*dc->thick/d;
    res|=Line(dc,x2-dx*d+dy*d+0.5,y2-dy*d-dx*d+0.5,z2,
	  x2,y2,z2,&GrPlot3,step);
    res|=Line(dc,x2-dx*d-dy*d+0.5,y2-dy*d+dx*d+0.5,z2,
	  x2,y2,z2,&GrPlot3,step);
  }
gr_done:
  if (was_transform)
    dc->flags|=DCF_TRANSFORMATION;
  if (was_symmetry)
    dc->flags|=DCF_SYMMETRY;
  return res;
}

public Bool GrTextBox3(CDC *dc=gr.dc,I64 x1,I64 y1,I64 z1,U8 *s,I64 border=2)
{//3D. Transformation. DCF_SYMMETRY is silly.
  U8 *ptr;
  I64 ch,res,w,w_max,h;
  if (!s) return FALSE;
  ptr=s;
  w=0;	w_max=0; h=FONT_HEIGHT;

  if (dc->flags & DCF_TRANSFORMATION)
    (*dc->transform)(dc,&x1,&y1,&z1);
  while (ch=*ptr++) {
    if (ch=='\t')
      w=CeilU64(w+FONT_WIDTH,FONT_WIDTH*8);
    else if (ch=='\n') {
      if (w>w_max) w_max=w;
      w=0;
      h+=FONT_HEIGHT;
    } else
      w+=FONT_WIDTH;
  }
  if (w>w_max) w_max=w;
  res=GrPrint(dc,x1,y1,"%s",s);
  res|=GrLine(dc,x1-border	   ,y1-border  ,x1+w_max+border,y1-border);
  res|=GrLine(dc,x1-border	   ,y1+h+border,x1+w_max+border,y1+h+border);
  res|=GrLine(dc,x1-border	   ,y1-border  ,x1-border,y1+h+border);
  res|=GrLine(dc,x1+w_max+border,y1-border  ,x1+w_max+border,y1+h+border);
  return ToBool(res);
}

#define DIAMOND_SLOPE_MAX	2.75

public Bool GrTextDiamond3(CDC *dc=gr.dc,
	I64 x1,I64 y1,I64 z1,U8 *_s,I64 border=2)
{//3D. Transformation. DCF_SYMMETRY is silly.
  U8 ch,*ptr,*ptr_end,*st,*s;
  I64 res=0,y,dx,dy,dx_old,dy_old,w,h=FONT_HEIGHT;
  F64 m;
  if (!_s) return FALSE;
  if (dc->flags & DCF_TRANSFORMATION)
    (*dc->transform)(dc,&x1,&y1,&z1);

  ptr=s=StrNew(_s);
  try {
    while (ch=*ptr) {
      if (ch=='\r' || ch=='\t')
	*ptr=CH_SPACE;
      if (ch=='\n') {
	*ptr=0;
	h+=FONT_HEIGHT;
      }
      ptr++;
    }
    ptr_end=ptr+1;

    y=y1-h>>1;
    dx=FONT_WIDTH +border;	//Minimum
    dy=FONT_HEIGHT+border+h>>1; //Minimum
    ptr=s;
    while (ptr!=ptr_end) {
      st=ptr;
      while (*ptr++);
      StrUtil(st,SUF_REM_LEADING|SUF_REM_TRAILING);

      w=(StrLen(st)*FONT_WIDTH)>>1;
      res|=GrPrint(dc,x1-w,y,"%s",st);
      if (w) {
	w+=border;
	do {
	  dx_old=dx; dy_old=dy;
	  m=ToF64(dx)/dy;
	  if (m<1/DIAMOND_SLOPE_MAX) {
	    dy=MaxI64(dy,Ceil(DIAMOND_SLOPE_MAX*dx));
	    m=1/DIAMOND_SLOPE_MAX;
	  } else if (m>DIAMOND_SLOPE_MAX) {
	    dy=MaxI64(dy,Ceil(dx/DIAMOND_SLOPE_MAX));
	    m=DIAMOND_SLOPE_MAX;
	  }
	  dx=MaxI64(dx,w+Ceil(m*AbsI64(y-y1)));
	  dx=MaxI64(dx,w+Ceil(m*AbsI64(y+FONT_HEIGHT-y1)));
	} while (dx!=dx_old || dy!=dy_old);
      }
      y+=FONT_HEIGHT;
    }
  } catch
    Free(s);
  Free(s);

  res|=GrLine(dc,x1,y1-dy,x1+dx,y1);
  res|=GrLine(dc,x1+dx,y1,x1,y1+dy);
  res|=GrLine(dc,x1,y1+dy,x1-dx,y1);
  res|=GrLine(dc,x1-dx,y1,x1,y1-dy);
  return ToBool(res);
}

public I64 Gr3Mesh(CDC *dc=gr.dc,I64 vertex_cnt,CD3I32 *p,
	I64 tri_cnt,CMeshTri *tri)
{//Returns cnt of pixs changed.
  CColorROPU32 old_color=dc->color;
  I64 i,x,y,z,res=0;
  CD3I32 *pt=NULL,*pt_sym=NULL,*p_sym,*dst;
  CMeshTri *tri_sym=tri;
  try {
    if (dc->flags&DCF_TRANSFORMATION) {
      dst=pt=MAlloc(sizeof(CD3I32)*vertex_cnt);
      for (i=0;i<vertex_cnt;i++,p++,dst++) {
	x=p->x; y=p->y; z=p->z;
	(*dc->transform)(dc,&x,&y,&z);
	dst->x=x; dst->y=y; dst->z=z;
      }
      p=pt;
    } else
      pt=NULL;

    if (dc->flags & DCF_SYMMETRY) {
      dst=pt_sym=MAlloc(sizeof(CD3I32)*vertex_cnt);
      p_sym=p;
      for (i=0;i<vertex_cnt;i++,p_sym++,dst++) {
	x=p_sym->x; y=p_sym->y; z=p_sym->z;
	DCReflect(dc,&x,&y,&z);
	dst->x=x; dst->y=y; dst->z=z;
      }
      p_sym=pt_sym;
      for (i=0;i<tri_cnt;i++,tri_sym++) {
	(*dc->lighting)(dc,&p_sym[tri_sym->nums[0]],&p_sym[tri_sym->nums[2]],
	      &p_sym[tri_sym->nums[1]],tri_sym->color);
	res+=GrFillTri0(dc,&p_sym[tri_sym->nums[0]],&p_sym[tri_sym->nums[2]],
	      &p_sym[tri_sym->nums[1]]);
      }
      Free(pt_sym);
      pt_sym=NULL;
      if (dc->flags&DCF_JUST_MIRROR)
	goto mesh_done;
    }
    for (i=0;i<tri_cnt;i++,tri++) {
      (*dc->lighting)(dc,&p[tri->nums[0]],&p[tri->nums[1]],
	    &p[tri->nums[2]],tri->color);
      res+=GrFillTri0(dc,&p[tri->nums[0]],&p[tri->nums[1]],&p[tri->nums[2]]);
    }
mesh_done:
    ;
  } catch {
    dc->color=old_color;
    Free(pt_sym);
    Free(pt);
  }
  dc->color=old_color;
  Free(pt);
  return res;
}
`;
