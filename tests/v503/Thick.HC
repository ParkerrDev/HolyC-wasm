I64 thick_widths[10]={0,1,2,3,7,8,31,63,64,65};

U64 ThickHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++) {
    hash=hash*65599+dc->body[i];
    if (dc->depth_buf) hash=hash*65599+dc->depth_buf[i];
  }
  return hash;
}

U0 ThickInit(CDC *dc,I32 *db,I64 flags,I64 width,I64 mode)
{
  dc->depth_buf=db;
  DCDepthBufRst(dc);
  DCRst(dc);
  dc->flags=0;
  DCFill(dc,GREEN);
  dc->thick=width;
  dc->flags=DCF_RECORD_EXTENTS|DCF_LOCATE_NEAREST;
  dc->cur_x=45;dc->cur_y=36;dc->nearest_dist=I64_MAX;
  dc->min_x=dc->min_y=I64_MAX;
  dc->max_x=dc->max_y=I64_MIN;
  if (flags&1) {
    Mat4x4RotZ(dc->r,0.25);
    Mat4x4Scale(dc->r,1.125);
    dc->x=9;dc->y=3;dc->z=4;
    dc->flags|=DCF_TRANSFORMATION;
  }
  if (flags&2) {
    DCSymmetrySet(dc,44,0,44,80);
    dc->flags|=DCF_SYMMETRY;
    if (mode&1) dc->flags|=DCF_JUST_MIRROR;
  }
  if (!(flags&4)) dc->depth_buf=NULL;
  if (flags&8) dc->flags|=DCF_DONT_DRAW;
  dc->color=(mode%4)<<8+RED;
  dc->bkcolor=BLUE;
  if (mode>=4) {
    dc->color.c1.color=YELLOW;
    if (mode==4) dc->color.c1.rop=ROPBF_DITHER;
    else dc->color.c1.rop=ROPBF_PROBABILITY_DITHER;
  }
  Seed(97);
}

U0 ThickResult(CDC *dc,I64 res)
{
  "%d %d %d %d %d %d %d %d %016X %016X\n",res,dc->flags,
	dc->collision_cnt,dc->min_x,dc->max_x,dc->min_y,dc->max_y,
	dc->nearest_dist,ThickHash(dc),RandI64;
}

U0 Thick()
{
  CDC *dc=DCNew(96,80);
  I32 *db=DCDepthBufAlloc(dc);
  CD3I32 ctrl[7];
  I64 i,k,mode,res;
  for (i=0;i<10;i++)
    for (mode=0;mode<6;mode++)
      for (k=0;k<16;k++) {
	ThickInit(dc,db,k,thick_widths[i],mode);
	res=GrPlot3(dc,-4,8,2);
	res+=GrPlot3(dc,48,40,7);
	res+=GrLine3(dc,-10,8,20,70,29,3);
	res+=GrLine3(dc,40,32,3,25,-5,15,2,2);
	ThickResult(dc,res);
      }
  for (i=0;i<7;i++) {
    ctrl[i].x=i*13-4;
    ctrl[i].y=i%3*18+8;
    ctrl[i].z=i%4;
  }
  for (i=0;i<10;i++)
    for (k=0;k<8;k++) {
      ThickInit(dc,db,k,thick_widths[k+1],k%6);
      switch (i) {
	case 0:
	  res=GrEllipse3(dc,44,34,7,28,15,0.25,2,0.5,4.0);
	  break;
	case 1:
	  res=GrCircle3(dc,44,34,7,28,2,0.5,4.0);
	  break;
	case 2:
	  res=GrRegPoly3(dc,44,34,7,28,15,5,0.25,1,0.5,4.0);
	  break;
	case 3:
	  res=Gr2Bezier3(dc,ctrl);
	  break;
	case 4:
	  res=Gr3Bezier3(dc,ctrl);
	  break;
	case 5:
	  res=Gr2BSpline3(dc,ctrl,7);
	  break;
	case 6:
	  res=Gr3BSpline3(dc,ctrl,7);
	  break;
	case 7:
	  res=Gr2BSpline3(dc,ctrl,7,TRUE);
	  break;
	case 8:
	  res=Gr3BSpline3(dc,ctrl,7,TRUE);
	  break;
	case 9:
	  GrBorder(dc,-3,6,60,40,2,1);
	  res=0;
	  break;
      }
      ThickResult(dc,res);
    }
  dc->depth_buf=db;
  DCDel(dc);
}

Thick;
