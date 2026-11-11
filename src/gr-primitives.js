//Public-domain primitives from TempleOS V5.03 Adam/Gr/GrPrimatives.HC.
export const GR_PRIMITIVES_SRC=String.raw`
public Bool GrEllipse(CDC *dc=gr.dc,
		I64 cx,I64 cy,
		I64 x_radius,I64 y_radius,
		F64 rot_angle=0,
		I64 step=1,
		F64 start_radians=0,
		F64 len_radians=2*π)
{//2D. Clipping but not transformation.
  Bool res;
  I32 *db=dc->depth_buf;
  dc->depth_buf=NULL;
  res=Ellipse(dc,cx,cy,0,x_radius,y_radius,&GrLinePlot,
	rot_angle,step,start_radians,len_radians);
  dc->depth_buf=db;
  return res;
}

public Bool GrRegPoly(CDC *dc=gr.dc,
		I64 cx,I64 cy,
		I64 x_radius,I64 y_radius,I64 sides,
		F64 rot_angle=0,
		I64 step=1,
		F64 start_radians=0,
		F64 len_radians=2*π)
{//2D. Clipping but no transform or thick.
  Bool res;
  I32 *db=dc->depth_buf;
  dc->depth_buf=NULL;
  res=RegPoly(dc,cx,cy,0,x_radius,y_radius,sides,
	&GrLinePlot,rot_angle,step,start_radians,len_radians);
  dc->depth_buf=db;
  return res;
}

public Bool Gr2Bezier(CDC *dc=gr.dc,CD3I32 *ctrl)
{//2nd order. Clipping but no transform or thick.
  return Bezier2(dc,ctrl,&GrLinePlot);
}

public Bool Gr3Bezier(CDC *dc=gr.dc,CD3I32 *ctrl)
{//3rd order. Clipping but no transform or thick.
  return Bezier3(dc,ctrl,&GrLinePlot);
}

public Bool Gr2BSpline(CDC *dc=gr.dc,CD3I32 *ctrl,I64 cnt,Bool closed=FALSE)
{//2nd order. Clipping but no transform or thick.
  return BSpline2(dc,ctrl,cnt,&GrLinePlot,closed);
}

public Bool Gr3BSpline(CDC *dc=gr.dc,CD3I32 *ctrl,I64 cnt,Bool closed=FALSE)
{//3rd order. Clipping but no transform or thick.
  return BSpline3(dc,ctrl,cnt,&GrLinePlot,closed);
}

public Bool GrPutChar3(CDC *dc=gr.dc,I64 x,I64 y,I64 z,U8 ch)
{//3D. Transformation. DCF_SYMMETRY is silly.
  if (dc->flags & DCF_TRANSFORMATION)
    (*dc->transform)(dc,&x,&y,&z);
  return GrPutChar(dc,x,y,ch);
}

public I64 GrBlot3(CDC *dc=gr.dc,I64 x1,I64 y1,I64 z1,CDC *img)
{//3D. Clipping and transformation.
  CColorROPU32 old_color=dc->color;
  I64  color,reg i,j,w=img->width,h=img->height,
	d1,dx1,dy1,dz1,
	reg d2,dx2,dy2,dz2,
	adx1,ady1,adz1,
	adx2,ady2,adz2,
	x2,y2,z2,x3,y3,z3,
	dw,reg dh,x,y,_x1,_y1,_z1,_x2,_y2,_z2,_x3,_y3,_z3,
	last_x,last_y,res=0;
  Bool first;
  CDC *old_brush=dc->brush;

  if (dc->depth_buf || dc->flags & (DCF_TRANSFORMATION | DCF_SYMMETRY)) {
    x2=x1+w; y2=y1; z2=z1;
    x3=x1; y3=y1+h; z3=z1;
    if (dc->flags & DCF_TRANSFORMATION) {
      (*dc->transform)(dc,&x1,&y1,&z1);
      (*dc->transform)(dc,&x2,&y2,&z2);
      (*dc->transform)(dc,&x3,&y3,&z3);
    }
    if (dc->flags & DCF_SYMMETRY) {
      _x1=x1; _y1=y1; _z1=z1;
      DCReflect(dc,&_x1,&_y1,&_z1);
      _x2=x2; _y2=y2; _z2=z2;
      DCReflect(dc,&_x2,&_y2,&_z2);
      _x3=x3; _y3=y3; _z3=z3;
      DCReflect(dc,&_x3,&_y3,&_z3);
      dx1=_x2-_x1; dy1=_y2-_y1; dz1=_z2-_z1;
      dx2=_x3-_x1; dy2=_y3-_y1; dz2=_z3-_z1;
      adx1=AbsI64(dx1); ady1=AbsI64(dy1); adz1=AbsI64(dz1);
      adx2=AbsI64(dx2); ady2=AbsI64(dy2); adz2=AbsI64(dz2);

      if (adx1>=ady1) {
	if (adx1>=adz1)
	  d1=adx1;
	else
	  d1=adz1;
      } else {
	if (ady1>=adz1)
	  d1=ady1;
	else
	  d1=adz1;
      }
      if (adx2>=ady2) {
	if (adx2>=adz2)
	  d2=adx2;
	else
	  d2=adz2;
      } else {
	if (ady2>=adz2)
	  d2=ady2;
	else
	  d2=adz2;
      }

      if (AbsI64(d1)!=w ||AbsI64(d2)!=h) {
	d1<<=1;
	d2<<=1;
      }
      if (d1) {
	dx1=dx1<<32/d1;
	dy1=dy1<<32/d1;
	dz1=dz1<<32/d1;
      } else
	goto normal_image;
      if (d2) {
	dx2=dx2<<32/d2;
	dy2=dy2<<32/d2;
	dz2=dz2<<32/d2;
      } else
	goto normal_image;
      dc->brush=NULL;
      x=0;y=0;
      dw=w<<32/d1;
      dh=h<<32/d2;

      first=TRUE;
      _x1<<=32; _y1<<=32; _z1<<=32;
      for (j=0;j<=d1;j++) {
	_x2=_x1; _y2=_y1; _z2=_z1;
	y=0;
	for (i=0;i<=d2;i++) {
	  if (_x2.i32[1]!=last_x || _y2.i32[1]!=last_y ||first) {
	    if ((color=GrPeek(img,x.i32[1],y.i32[1]))>=0) {
	      if (dc->color.c0.rop==ROPB_MONO) {
		if (color) {
		  dc->color=old_color&~ROPF_DITHER;
		  if (dc->depth_buf) {
		    dc->db_z=_z2.i32[1];
		    GrPlot1(dc,_x2.i32[1],_y2.i32[1]);
		  } else
		    GrPlot(dc,_x2.i32[1],_y2.i32[1]);
		}
	      } else {
		if (color!=TRANSPARENT) {
		  dc->color=old_color&~COLORROP_NO_ROP0_MASK|color;
		  if (dc->depth_buf) {
		    dc->db_z=_z2.i32[1];
		    GrPlot1(dc,_x2.i32[1],_y2.i32[1]);
		  } else
		    GrPlot(dc,_x2.i32[1],_y2.i32[1]);
		}
	      }
	    }
	  }
	  first=FALSE;
	  last_x=_x2.i32[1]; last_y=_y2.i32[1];
	  _x2+=dx2; _y2+=dy2; _z2+=dz2;
	  y+=dh;
	}
	_x1+=dx1; _y1+=dy1; _z1+=dz1;
	x+=dw;
      }
      res=1;
normal_image:
      if (dc->flags&DCF_JUST_MIRROR)
	goto gr_done;
    }
    dx1=x2-x1; dy1=y2-y1; dz1=z2-z1;
    dx2=x3-x1; dy2=y3-y1; dz2=z3-z1;
    adx1=AbsI64(dx1); ady1=AbsI64(dy1); adz1=AbsI64(dz1);
    adx2=AbsI64(dx2); ady2=AbsI64(dy2); adz2=AbsI64(dz2);

    if (adx1>=ady1) {
      if (adx1>=adz1)
	d1=adx1;
      else
	d1=adz1;
    } else {
      if (ady1>=adz1)
	d1=ady1;
      else
	d1=adz1;
    }
    if (adx2>=ady2) {
      if (adx2>=adz2)
	d2=adx2;
      else
	d2=adz2;
    } else {
      if (ady2>=adz2)
	d2=ady2;
      else
	d2=adz2;
    }
    if (AbsI64(d1)!=w ||AbsI64(d2)!=h) {
      d1<<=1;
      d2<<=1;
    }
    if (d1) {
      dx1=dx1<<32/d1;
      dy1=dy1<<32/d1;
      dz1=dz1<<32/d1;
    } else
      goto gr_done;
    if (d2) {
      dx2=dx2<<32/d2;
      dy2=dy2<<32/d2;
      dz2=dz2<<32/d2;
    } else
      goto gr_done;
    dc->brush=NULL;
    x=0;y=0;
    dw=w<<32/d1;
    dh=h<<32/d2;

    first=TRUE;
    x1<<=32; y1<<=32; z1<<=32;
    for (j=0;j<=d1;j++) {
      x2=x1; y2=y1; z2=z1;
      y=0;
      for (i=0;i<=d2;i++) {
	if (x2.i32[1]!=last_x || y2.i32[1]!=last_y || first) {
	  if ((color=GrPeek(img,x.i32[1],y.i32[1]))>=0) {
	    if (dc->color.c0.rop==ROPB_MONO) {
	      if (color) {
		dc->color=old_color&~ROPF_DITHER;
		if (dc->depth_buf) {
		  dc->db_z=z2.i32[1];
		  GrPlot1(dc,x2.i32[1],y2.i32[1]);
		} else
		  GrPlot(dc,x2.i32[1],y2.i32[1]);
	      }
	    } else {
	      if (color!=TRANSPARENT) {
		dc->color=old_color&~COLORROP_NO_ROP0_MASK|color;//COLOR
		if (dc->depth_buf) {
		  dc->db_z=z2.i32[1];
		  GrPlot1(dc,x2.i32[1],y2.i32[1]);
		} else
		  GrPlot(dc,x2.i32[1],y2.i32[1]);
	      }
	    }
	  }
	}
	first=FALSE;
	last_x=x2.i32[1]; last_y=y2.i32[1];
	x2+=dx2; y2+=dy2; z2+=dz2;
	y+=dh;
      }
      x1+=dx1; y1+=dy1; z1+=dz1;
      x+=dw;
    }
    res=1;  //TODO: check off scrn
  } else
    res=GrBlot(dc,x1,y1,img);
gr_done:
  dc->color=old_color;
  dc->brush=old_brush;
  return res;
}
public Bool GrPlot3B(CDC *dc=gr.dc,I64 x,I64 y,I64 z)
{//3D. Clipping and transformation but no thick.
  I64 _x,_y,_z;
  Bool was_transform=FALSE,was_symmetry=FALSE;
  if (dc->flags & DCF_TRANSFORMATION) {
    (*dc->transform)(dc,&x,&y,&z);
    dc->flags&=~DCF_TRANSFORMATION;
    was_transform=TRUE;
  }
  if (dc->flags & DCF_SYMMETRY) {
    _x=x; _y=y; _z=z;
    DCReflect(dc,&_x,&_y,&_z);
    dc->flags&=~DCF_SYMMETRY;
    dc->db_z=_z;
    GrPlot1(dc,_x,_y);
    was_symmetry=TRUE;
    if (dc->flags&DCF_JUST_MIRROR)
      goto gr_done;
  }
  dc->db_z=z;
  GrPlot1(dc,x,y);
gr_done:
  if (was_transform)
    dc->flags|=DCF_TRANSFORMATION;
  if (was_symmetry)
    dc->flags|=DCF_SYMMETRY;
  return TRUE;
}

U0 __hgr_pen_init()
{
  CDC *dc;
  I64 i,k,x,y,rr;
  for (i=0;i<GR_PEN_BRUSHES_NUM;i++) {
    k=i+1;

    rr=k*k;
    for (y=1;y<k;y++)
      for (x=1;x<k;x++)
	if (SqrI64(y*2-k)+SqrI64(x*2-k)<rr) {
	  if (x-1-i>>1<gr.circle_lo[i][i-y])
	    gr.circle_lo[i][i-y]=x-1-i>>1;
	  if (x-1-i>>1>gr.circle_hi[i][i-y])
	    gr.circle_hi[i][i-y]=x-1-i>>1;
	}

    dc=DCNew(i,i);
    gr.pen_brushes[i]=dc;
    dc->color=COLOR_MONO;
    rr=k*k;
    for (y=1;y<k;y++)
      for (x=1;x<k;x++)
	if (SqrI64(y*2-k)+SqrI64(x*2-k)<rr)
	  GrPlot0(dc,x-1,y-1);

    dc=DCNew(i,i);
    gr.collision_pen_brushes[i]=dc;
    dc->color=COLOR_INVALID;//Want color that never occurs.
    rr=k*k;
    for (y=1;y<k;y++)
      for (x=1;x<k;x++)
	if (SqrI64(y*2-k)+SqrI64(x*2-k)<rr)
	  GrPlot0(dc,x-1,y-1);

    dc=DCNew(i,i);
    gr.even_pen_brushes[i]=dc;
    dc->color=COLOR_MONO;
    rr=k*k;
    for (y=1;y<k;y++)
      for (x=1;x<k;x++)
	if (!(((x-1)^(y-1))&1) && SqrI64(y*2-k)+SqrI64(x*2-k)<rr)
	  GrPlot0(dc,x-1,y-1);

    dc=DCNew(i,i);
    gr.odd_pen_brushes[i]=dc;
    dc->color=COLOR_MONO;
    rr=k*k;
    for (y=1;y<k;y++)
      for (x=1;x<k;x++)
	if (((x-1)^(y-1))&1 && SqrI64(y*2-k)+SqrI64(x*2-k)<rr)
	  GrPlot0(dc,x-1,y-1);
  }
}

I64 GrFillSemiCircle(CDC *dc=gr.dc,I64 cx,I64 cy,I64 z=0,I64 diameter,I64 n)
{//2D. Clipping but not transformation.
  I64 res=0,i,k,r=diameter>>1,rr;
  if (diameter>=1)
    switch (n) {
      case 0:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=0;i<r;i++)
	    res+=GrHLine(dc,gr.circle_lo[diameter][i]+cx,
		  gr.circle_hi[diameter][i]+cx,cy+i-r,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=0;i<r;i++)
	    res+=GrHLine(dc,-Sqrt(rr-SqrI64(r-i))+cx,
		  Sqrt(rr-SqrI64(r-i))+cx,cy+i-r,z,z);
	}
	break;
      case 1:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=r+1;i<diameter;i++)
	    res+=GrHLine(dc,gr.circle_lo[diameter][i]+cx,
		  gr.circle_hi[diameter][i]+cx,cy+i-r,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=r+1;i<k;i++)
	    res+=GrHLine(dc,-Sqrt(rr-SqrI64(i-r))+cx,
		  Sqrt(rr-SqrI64(i-r))+cx,cy+i-r,z,z);
	}
	break;
      case 2:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=0;i<r;i++)
	    res+=GrVLine(dc,cx+i-r,gr.circle_lo[diameter][i]+cy,
		  gr.circle_hi[diameter][i]+cy,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=0;i<r;i++)
	    res+=GrVLine(dc,cx+i-r,-Sqrt(rr-SqrI64(r-i))+cy,
		  Sqrt(rr-SqrI64(r-i))+cy,z,z);
	}
	break;
      case 3:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=r+1;i<diameter;i++)
	    res+=GrVLine(dc,cx+i-r,gr.circle_lo[diameter][i]+cy,
		  gr.circle_hi[diameter][i]+cy,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=r+1;i<k;i++)
	    res+=GrVLine(dc,cx+i-r,-Sqrt(rr-SqrI64(i-r))+cy,
		  Sqrt(rr-SqrI64(i-r))+cy,z,z);
	}
	break;
      case 4:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=0;i<r;i++)
	    res+=GrHLine(dc,gr.circle_lo[diameter][i]+cx,
		  gr.circle_hi[diameter][i]+cx,cy+i-r,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=0;i<r;i++)
	    res+=GrHLine(dc,-Sqrt(rr-SqrI64(r-i))+cx,
		  Sqrt(rr-SqrI64(r-i))+cx,cy+i-r,z,z);
	}
	break;
      case 5:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=r+1;i<diameter;i++)
	    res+=GrHLine(dc,gr.circle_lo[diameter][i]+cx,
		  gr.circle_hi[diameter][i]+cx,cy+i-r,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=r+1;i<k;i++)
	    res+=GrHLine(dc,-Sqrt(rr-SqrI64(i-r))+cx,
		  Sqrt(rr-SqrI64(i-r))+cx,cy+i-r,z,z);
	}
	break;
      case 6:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=0;i<r;i++)
	    res+=GrVLine(dc,cx+i-r,gr.circle_lo[diameter][i]+cy,
		  gr.circle_hi[diameter][i]+cy,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=0;i<r;i++)
	    res+=GrVLine(dc,cx+i-r,-Sqrt(rr-SqrI64(r-i))+cy,
		  Sqrt(rr-SqrI64(r-i))+cy,z,z);
	}
	break;
      case 7:
	if (diameter<GR_PEN_BRUSHES_NUM)
	  for (i=r+1;i<diameter;i++)
	    res+=GrVLine(dc,cx+i-r,gr.circle_lo[diameter][i]+cy,
		  gr.circle_hi[diameter][i]+cy,z,z);
	else {
	  k=diameter+1;
	  rr=SqrI64((k+1)>>1);
	  for (i=r+1;i<k;i++)
	    res+=GrVLine(dc,cx+i-r,-Sqrt(rr-SqrI64(i-r))+cy,
		  Sqrt(rr-SqrI64(i-r))+cy,z,z);
	}
	break;
    }
  return res;
}

public I64 GrFillCircle(CDC *dc=gr.dc,I64 cx,I64 cy,I64 z=0,I64 diameter)
{//2D. Clipping but not transformation.
  I64 res=0,i,k,r=diameter>>1,rr;
  if (diameter>=1) {
    if (diameter<GR_PEN_BRUSHES_NUM)
      for (i=0;i<diameter;i++)
	res+=GrHLine(dc,gr.circle_lo[diameter][i]+cx,
	      gr.circle_hi[diameter][i]+cx,cy+i-r,z,z);
    else {
      k=diameter+1;
      rr=SqrI64((k+1)>>1);
      for (i=0;i<=r;i++)
	res+=GrHLine(dc,-Sqrt(rr-SqrI64(r-i))+cx,
	      Sqrt(rr-SqrI64(r-i))+cx,cy+i-r,z,z);
      for (;i<k;i++)
	res+=GrHLine(dc,-Sqrt(rr-SqrI64(i-r))+cx,
	      Sqrt(rr-SqrI64(i-r))+cx,cy+i-r,z,z);
    }
  }
  return res;
}

public Bool GrPlot3(CDC *dc=gr.dc,I64 x,I64 y,I64 z)
{//3D. Clipping and transformation and thick.
  I64 _x,_y,_z,w,dist;
  CColorROPU32 old_color=dc->color;
  Bool record,was_transform=FALSE,was_symmetry=FALSE;
  CTask *win_task;
  if (dc->flags & DCF_TRANSFORMATION) {
    (*dc->transform)(dc,&x,&y,&z);
    dc->flags&=~DCF_TRANSFORMATION;
    was_transform=TRUE;
  }
  if (dc->flags & DCF_SYMMETRY) {
    _x=x; _y=y; _z=z;
    DCReflect(dc,&_x,&_y,&_z);
    dc->flags&=~DCF_SYMMETRY;
    GrPlot3(dc,_x,_y,_z);
    was_symmetry=TRUE;
    if (dc->flags&DCF_JUST_MIRROR)
      goto gr_done;
  }
  w=dc->thick>>1;
  dc->db_z=z;
  if (dc->brush || w<=0)
    GrPlot1(dc,x,y);
  else if (dc->thick<GR_PEN_BRUSHES_NUM) {
    if (dc->color.c0.rop!=ROPB_COLLISION)
      dc->color.c0.rop=ROPB_MONO;
    if (dc->depth_buf) {
      if (dc->color.c1.rop&ROPBF_DITHER) {
	dc->color.c1.rop=dc->color.c0.rop;
	if (((x-w)^(y-w))&1) {
	  record=GrBlot3(dc,x-w,y-w,z,gr.odd_pen_brushes[dc->thick]);
	  dc->color.c0=dc->color.c1;
	  record=GrBlot3(dc,x-w,y-w,z,gr.even_pen_brushes[dc->thick]);
	} else {
	  record=GrBlot3(dc,x-w,y-w,z,gr.even_pen_brushes[dc->thick]);
	  dc->color.c0=dc->color.c1;
	  record=GrBlot3(dc,x-w,y-w,z,gr.odd_pen_brushes[dc->thick]);
	}
      } else {
	if (dc->color.c0.rop==ROPB_COLLISION) {
	  if (dc->color.c0.color!=dc->bkcolor.c0.color &&
		dc->color.c0.color!=TRANSPARENT)
	    record=GrBlot3(dc,x-w,y-w,z,
		  gr.collision_pen_brushes[dc->thick]);
	  else
	    record=FALSE;
	} else
	  record=GrBlot3(dc,x-w,y-w,z,gr.pen_brushes[dc->thick]);
      }
    } else {
      if (dc->color.c1.rop&ROPBF_DITHER) {
	dc->color.c1.rop=dc->color.c0.rop;
	if (((x-w)^(y-w))&1) {
	  record=GrBlot(dc,x-w,y-w,gr.odd_pen_brushes[dc->thick]);
	  dc->color.c0=dc->color.c1;
	  record=GrBlot(dc,x-w,y-w,gr.even_pen_brushes[dc->thick]);
	} else {
	  record=GrBlot(dc,x-w,y-w,gr.even_pen_brushes[dc->thick]);
	  dc->color.c0=dc->color.c1;
	  record=GrBlot(dc,x-w,y-w,gr.odd_pen_brushes[dc->thick]);
	}
      } else {
	if (dc->color.c0.rop==ROPB_COLLISION) {
	  if (dc->color.c0.color!=dc->bkcolor.c0.color &&
		dc->color.c0.color!=TRANSPARENT)
	    record=GrBlot(dc,x-w,y-w,gr.collision_pen_brushes[dc->thick]);
	  else
	    record=FALSE;
	} else
	  record=GrBlot(dc,x-w,y-w,gr.pen_brushes[dc->thick]);
      }
    }
    if (record) {
      if (dc->flags & DCF_SCRN_BITMAP) {
	win_task=dc->win_task;
	x+=win_task->pix_left+win_task->scroll_x;
	y+=win_task->pix_top+win_task->scroll_y;
      }
      if (dc->flags & DCF_LOCATE_NEAREST) {
	dist=DistSqrI64(x,y,dc->cur_x,dc->cur_y);
	if (dist<=dc->nearest_dist)
	  dc->nearest_dist=dist;
      }
      if (dc->flags & DCF_RECORD_EXTENTS) {
	if (x-w<dc->min_x) dc->min_x=x-w;
	if (y-w<dc->min_y) dc->min_y=y-w;
	if (dc->thick & 1) {
	  if (x+w>dc->max_x) dc->max_x=x+w;
	  if (y+w>dc->max_y) dc->max_y=y+w;
	} else {
	  if (x+w-1>dc->max_x) dc->max_x=x+w-1;
	  if (y+w-1>dc->max_y) dc->max_y=y+w-1;
	}
      }
    }
  } else
    GrFillCircle(dc,x,y,dc->db_z,dc->thick);
gr_done:
  dc->color=old_color;
  if (was_transform)
    dc->flags|=DCF_TRANSFORMATION;
  if (was_symmetry)
    dc->flags|=DCF_SYMMETRY;
  return TRUE;
}

I64 GrLineFat3(CDC *dc=gr.dc,I64 x1,I64 y1,I64 z1,I64 x2,I64 y2,I64 z2,
	I64 width,I64 start=0)
{//Step through line segment calling callback.
//Uses $LK,"fixed-point",A="FI:::/Demo/Lectures/FixedPoint.HC"$.
  I64 res=0,i,j,d,dx=x2-x1,dy=y2-y1,dz=z2-z1,_x,_y,_z,d_lo,d_hi,
	adx=AbsI64(dx),ady=AbsI64(dy),adz=AbsI64(dz);
  if (width>0) {
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
      x1<<=32; y1<<=32; z1<<=32;
      for (j=0;j<start;j++) {
	x1+=dx; y1+=dy; z1+=dz;
      }
      if (start>=d)
	res+=GrFillCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width);
      else {
	if (width==1)
	  for (i=start;i<=d;i++) {
	    dc->db_z=z1.i32[1];
	    res+=GrPlot1(dc,x1.i32[1],y1.i32[1]);
	    _x=x1.i32[1]; _y=y1.i32[1]; _z=z1.i32[1];
	    x1+=dx; y1+=dy; z1+=dz;
	  }
	else {
	  i=width*Sqrt(SqrI64(adx)+SqrI64(ady))/adx;
	  d_lo=i>>1; d_hi=(i-1)>>1;

	  if (dx>=0)
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,2);
	  else
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,7);
	  for (i=start;i<=d;i++) {
	    res+=GrVLine(dc,x1.i32[1],y1.i32[1]-d_lo,y1.i32[1]+d_hi,
		  z1.i32[1],z1.i32[1]);
	    _x=x1.i32[1]; _y=y1.i32[1]; _z=z1.i32[1];
	    x1+=dx; y1+=dy; z1+=dz;
	  }
	  x1-=dx; y1-=dy; z1-=dz;
	  if (dx>=0)
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,3);
	  else
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,6);
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
      x1<<=32; y1<<=32; z1<<=32;
      for (j=0;j<start;j++) {
	x1+=dx; y1+=dy; z1+=dz;
      }
      if (start>=d)
	res+=GrFillCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width);
      else {
	if (width==1)
	  for (i=start;i<=d;i++) {
	    dc->db_z=z1.i32[1];
	    res+=GrPlot1(dc,x1.i32[1],y1.i32[1]);
	    _x=x1.i32[1]; _y=y1.i32[1]; _z=z1.i32[1];
	    x1+=dx; y1+=dy; z1+=dz;
	  }
	else {
	  i=width*Sqrt(SqrI64(ady)+SqrI64(adx))/ady;
	  d_lo=i>>1; d_hi=(i-1)>>1;

	  if (dy>=0)
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,0);
	  else
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,5);
	  for (i=start;i<=d;i++) {
	    res+=GrHLine(dc,x1.i32[1]-d_lo,x1.i32[1]+d_hi,y1.i32[1],
		  z1.i32[1],z1.i32[1]);
	    _x=x1.i32[1]; _y=y1.i32[1]; _z=z1.i32[1];
	    x1+=dx; y1+=dy; z1+=dz;
	  }
	  x1-=dx; y1-=dy; z1-=dz;
	  if (dy>=0)
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,1);
	  else
	    res+=GrFillSemiCircle(dc,x1.i32[1],y1.i32[1],z1.i32[1],width,4);
	}
      }
    }
  }
  return res;
}

public Bool GrLine3(CDC *dc=gr.dc,I64 x1,I64 y1,I64 z1,I64 x2,I64 y2,I64 z2,
	I64 step=1,I64 start=0)
{//3D. Transformation with thick.
  I64 _x1,_y1,_z1,_x2,_y2,_z2;
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
    if (step==1 && !dc->brush) {
      if (!start && dc->thick<2 && !dc->depth_buf) {//TODO: clip z depbuf
	if (DCClipLine(dc,&_x1,&_y1,&_x2,&_y2))
	  res=Line(dc,_x1,_y1,0,_x2,_y2,0,&GrLinePlot0,step,start);
      } else {
	if (GrLineFat3(dc,_x1,_y1,_z1,_x2,_y2,_z2,dc->thick,start))
	  res=TRUE;
      }
    } else
      res=Line(dc,_x1,_y1,_z1,_x2,_y2,_z2,&GrPlot3,step,start);
    was_symmetry=TRUE;
    if (dc->flags&DCF_JUST_MIRROR)
      goto gr_done;
  }
  if (step==1 && !dc->brush) {
    if (!start && dc->thick<2 && !dc->depth_buf) {//TODO: clip z depbuf
      if (DCClipLine(dc,&x1,&y1,&x2,&y2))
	res|=Line(dc,x1,y1,0,x2,y2,0,&GrLinePlot0,step,start);
    } else {
      if (GrLineFat3(dc,x1,y1,z1,x2,y2,z2,dc->thick,start))
	res=TRUE;
    }
  } else
    res|=Line(dc,x1,y1,z1,x2,y2,z2,&GrPlot3,step,start);
gr_done:
  if (was_transform)
    dc->flags|=DCF_TRANSFORMATION;
  if (was_symmetry)
    dc->flags|=DCF_SYMMETRY;
  return res;
}

public Bool GrEllipse3(CDC *dc=gr.dc,
		I64 cx,I64 cy,I64 cz,
		I64 x_radius,I64 y_radius,
		F64 rot_angle=0,
		I64 step=1,
		F64 start_radians=0,
		F64 len_radians=2*π)
{//3D. Transformation with thick.
  Bool res;
  I64 x,y,z,xx,yy,zz;
  F64 m1,arg1,m2,arg2,s,c;
  if (dc->flags & DCF_TRANSFORMATION) {
    dc->flags&=~DCF_TRANSFORMATION;
    (*dc->transform)(dc,&cx,&cy,&cz);

    c=Cos(rot_angle);
    s=Sin(rot_angle);

    x_radius<<=16;
    y_radius<<=16;

    xx=0;
    yy=0;
    zz=0;
    (*dc->transform)(dc,&xx,&yy,&zz);

    x=x_radius*c;
    y=x_radius*s;
    z=0;
    (*dc->transform)(dc,&x,&y,&z);
    x-=xx;
    y-=yy;
    z-=zz;
    R2P(&m1,&arg1,x,y);

    x=-y_radius*s;
    y=y_radius*c;
    z=0;
    (*dc->transform)(dc,&x,&y,&z);
    x-=xx;
    y-=yy;
    z-=zz;
    R2P(&m2,&arg2,x,y);
    m2*=Abs(Sin(arg2-arg1));

    res=Ellipse(dc,cx,cy,cz,
	  m1/0x10000,m2/0x10000,&GrPlot3,-arg1,step,start_radians,len_radians);
    dc->flags|=DCF_TRANSFORMATION;
  } else
    res=Ellipse(dc,cx,cy,cz,x_radius,y_radius,&GrPlot3,
	  rot_angle,step,start_radians,len_radians);
  return res;
}

public Bool GrCircle3(CDC *dc=gr.dc,I64 cx,I64 cy,I64 cz,I64 radius,
  I64 step=1,F64 start_radians=0,F64 len_radians=2*π)
{//3D. Transformation with thick.
  if (dc->flags & DCF_TRANSFORMATION)
    return GrEllipse3(dc,cx,cy,cz,radius,radius,0,step,
	  start_radians,len_radians);
  else
    return Circle(dc,cx,cy,cz,radius,&GrPlot3,step,
	  start_radians,len_radians);
}

public Bool GrRegPoly3(CDC *dc=gr.dc,
		I64 cx,I64 cy,I64 cz,
		I64 x_radius,I64 y_radius,I64 sides,
		F64 rot_angle=0,
		I64 step=1,
		F64 start_radians=0,
		F64 len_radians=2*π)
{//3D. Clipping and transform and thick.
  Bool res;
  I64 x,y,z,xx,yy,zz;
  F64 m1,arg1,m2,arg2,s,c;
  if (dc->flags & DCF_TRANSFORMATION) {
    dc->flags&=~DCF_TRANSFORMATION;
    (*dc->transform)(dc,&cx,&cy,&cz);

    c=Cos(rot_angle);
    s=Sin(rot_angle);

    x_radius<<=16;
    y_radius<<=16;

    xx=0;
    yy=0;
    zz=0;
    (*dc->transform)(dc,&xx,&yy,&zz);

    x=x_radius*c;
    y=x_radius*s;
    z=0;
    (*dc->transform)(dc,&x,&y,&z);
    x-=xx;
    y-=yy;
    z-=zz;
    R2P(&m1,&arg1,x,y);

    x=-y_radius*s;
    y=y_radius*c;
    z=0;
    (*dc->transform)(dc,&x,&y,&z);
    x-=xx;
    y-=yy;
    z-=zz;
    R2P(&m2,&arg2,x,y);
    m2*=Abs(Sin(arg2-arg1));

    res=RegPoly(dc,cx,cy,cz,
	  m1/0x10000,m2/0x10000,sides,&GrPlot3,-arg1,
	  step,start_radians,len_radians);
    dc->flags|=DCF_TRANSFORMATION;
  } else
    res=RegPoly(dc,cx,cy,cz,x_radius,y_radius,sides,&GrPlot3,
	  rot_angle,step,start_radians,len_radians);
  return res;
}

public Bool Gr2Bezier3(CDC *dc=gr.dc,CD3I32 *ctrl)
{//2nd order. Clipping and transform and thick.
  Bool res=FALSE;
  I64 i,x,y,z,
	old_flags=dc->flags;
  CD3I32 *ctrl2=NULL,*ctrl3=NULL;
  if (dc->flags & DCF_TRANSFORMATION) {
    ctrl2=MAlloc(sizeof(CD3I32)*3);
    for (i=0;i<3;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      (*dc->transform)(dc,&x,&y,&z);
      ctrl2[i].x=x;
      ctrl2[i].y=y;
      ctrl2[i].z=z;
    }
    dc->flags&=~DCF_TRANSFORMATION;
    ctrl=ctrl2;
  }
  if (dc->flags & DCF_SYMMETRY) {
    ctrl3=MAlloc(sizeof(CD3I32)*3);
    for (i=0;i<3;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      DCReflect(dc,&x,&y,&z);
      ctrl3[i].x=x;
      ctrl3[i].y=y;
      ctrl3[i].z=z;
    }
    dc->flags&=~DCF_SYMMETRY;
    res=Bezier2(dc,ctrl3,&GrPlot3);
    if (dc->flags & DCF_JUST_MIRROR)
      goto gr_done;
  }

  res|=Bezier2(dc,ctrl,&GrPlot3);
gr_done:
  Free(ctrl2);
  Free(ctrl3);
  dc->flags=old_flags;
  return res;
}

public Bool Gr3Bezier3(CDC *dc=gr.dc,CD3I32 *ctrl)
{//3rd order. Clipping and transform and thick.
  Bool res=FALSE;
  I64 i,x,y,z,
	old_flags=dc->flags;
  CD3I32 *ctrl2=NULL,*ctrl3=NULL;
  if (dc->flags & DCF_TRANSFORMATION) {
    ctrl2=MAlloc(sizeof(CD3I32)*4);
    for (i=0;i<4;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      (*dc->transform)(dc,&x,&y,&z);
      ctrl2[i].x=x;
      ctrl2[i].y=y;
      ctrl2[i].z=z;
    }
    dc->flags&=~DCF_TRANSFORMATION;
    ctrl=ctrl2;
  }
  if (dc->flags & DCF_SYMMETRY) {
    ctrl3=MAlloc(sizeof(CD3I32)*4);
    for (i=0;i<4;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      DCReflect(dc,&x,&y,&z);
      ctrl3[i].x=x;
      ctrl3[i].y=y;
      ctrl3[i].z=z;
    }
    dc->flags&=~DCF_SYMMETRY;
    res=Bezier3(dc,ctrl3,&GrPlot3);
    if (dc->flags & DCF_JUST_MIRROR)
      goto gr_done;
  }

  res|=Bezier3(dc,ctrl,&GrPlot3);
gr_done:
  Free(ctrl2);
  Free(ctrl3);
  dc->flags=old_flags;
  return res;
}

public I64 Gr2BSpline3(CDC *dc=gr.dc,CD3I32 *ctrl,I64 cnt,Bool closed=FALSE)
{//2nd order. Clipping and transform and thick.
  Bool res=FALSE;
  I64 i,x,y,z,
	old_flags=dc->flags;
  CD3I32 *ctrl2=NULL,*ctrl3=NULL;
  if (dc->flags & DCF_TRANSFORMATION) {
    ctrl2=MAlloc(sizeof(CD3I32)*cnt);
    for (i=0;i<cnt;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      (*dc->transform)(dc,&x,&y,&z);
      ctrl2[i].x=x;
      ctrl2[i].y=y;
      ctrl2[i].z=z;
    }
    dc->flags&=~DCF_TRANSFORMATION;
    ctrl=ctrl2;
  }
  if (dc->flags & DCF_SYMMETRY) {
    ctrl3=MAlloc(sizeof(CD3I32)*cnt);
    for (i=0;i<cnt;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      DCReflect(dc,&x,&y,&z);
      ctrl3[i].x=x;
      ctrl3[i].y=y;
      ctrl3[i].z=z;
    }
    dc->flags&=~DCF_SYMMETRY;
    res=BSpline2(dc,ctrl3,cnt,&GrPlot3,closed);
    if (dc->flags & DCF_JUST_MIRROR)
      goto gr_done;
  }

  res|=BSpline2(dc,ctrl,cnt,&GrPlot3,closed);
gr_done:
  Free(ctrl2);
  Free(ctrl3);
  dc->flags=old_flags;
  return res;
}

public Bool Gr3BSpline3(CDC *dc=gr.dc,CD3I32 *ctrl,I64 cnt,Bool closed=FALSE)
{//3rd order. Clipping and transform and thick.
  Bool res=FALSE;
  I64 i,x,y,z,
	old_flags=dc->flags;
  CD3I32 *ctrl2=NULL,*ctrl3=NULL;
  if (dc->flags & DCF_TRANSFORMATION) {
    ctrl2=MAlloc(sizeof(CD3I32)*cnt);
    for (i=0;i<cnt;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      (*dc->transform)(dc,&x,&y,&z);
      ctrl2[i].x=x;
      ctrl2[i].y=y;
      ctrl2[i].z=z;
    }
    dc->flags&=~DCF_TRANSFORMATION;
    ctrl=ctrl2;
  }
  if (dc->flags & DCF_SYMMETRY) {
    ctrl3=MAlloc(sizeof(CD3I32)*cnt);
    for (i=0;i<cnt;i++) {
      x=ctrl[i].x;
      y=ctrl[i].y;
      z=ctrl[i].z;
      DCReflect(dc,&x,&y,&z);
      ctrl3[i].x=x;
      ctrl3[i].y=y;
      ctrl3[i].z=z;
    }
    dc->flags&=~DCF_SYMMETRY;
    res=BSpline3(dc,ctrl3,cnt,&GrPlot3,closed);
    if (dc->flags & DCF_JUST_MIRROR)
      goto gr_done;
  }

  res|=BSpline3(dc,ctrl,cnt,&GrPlot3,closed);
gr_done:
  Free(ctrl2);
  Free(ctrl3);
  dc->flags=old_flags;
  return res;
}

`;
