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

`;
