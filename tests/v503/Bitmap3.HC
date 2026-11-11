U64 Bitmap3Hash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++)
    hash=hash*65599+dc->body[i];
  return hash;
}

U64 Depth3Hash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  if (dc->depth_buf)
    for (i=0;i<dc->width_internal*dc->height;i++)
      hash=hash*65599+dc->depth_buf[i];
  return hash;
}

U0 Bitmap3()
{
  CDC *dc=DCNew(29,23),*img=DCNew(9,7);
  I32 *db=DCDepthBufAlloc(dc);
  I64 i,k,res;
  CD3I32 ctrl[7];
  for (i=0;i<img->width_internal*img->height;i++)
    if (i%5) img->body[i]=i%16;
    else img->body[i]=TRANSPARENT;
  for (k=0;k<128;k++) {
    dc->depth_buf=db;
    DCDepthBufRst(dc);
    DCRst(dc);
    DCFill(dc,BLUE);
    if (k/32==2) DCFill(dc,GREEN);
    dc->flags=DCF_RECORD_EXTENTS;
    dc->min_x=dc->min_y=I64_MAX;
    dc->max_x=dc->max_y=I64_MIN;
    if (k&1) {
      Mat4x4RotZ(dc->r,0.25);
      Mat4x4Scale(dc->r,1.5);
      dc->x=3;dc->y=2;dc->z=4;
      dc->flags|=DCF_TRANSFORMATION;
    }
    if (k&2) {
      DCSymmetrySet(dc,14,0,14,23);
      dc->flags|=DCF_SYMMETRY;
    }
    if (k&4) dc->flags|=DCF_JUST_MIRROR;
    if (!(k&8)) dc->depth_buf=NULL;
    if (k&16) dc->flags|=DCF_DONT_DRAW;
    dc->color=(k/32)<<8+RED;
    dc->bkcolor=BLUE;
    res=GrBlot3(dc,-3,4,11,img);
    res+=GrBlot3(dc,10,8,7,img);
    res+=GrBlot3(dc,12,6,19,img);
    "%d %d %d %d %d %d %d %016X %016X\n",res,dc->collision_cnt,
	  dc->min_x,dc->max_x,dc->min_y,dc->max_y,dc->color,
	  Bitmap3Hash(dc),Depth3Hash(dc);
  }
  for (i=0;i<7;i++) {
    ctrl[i].x=i*7-8;
    ctrl[i].y=i%3*8;
    ctrl[i].z=i%4;
  }
  dc->depth_buf=db;
  DCDepthBufRst(dc);
  DCRst(dc);
  dc->flags=0;
  dc->color=YELLOW;
  DCClear(dc);
  dc->brush=img;
  res=Gr2Bezier(dc,ctrl);
  "%d %016X %016X %d\n",res,Bitmap3Hash(dc),Depth3Hash(dc),
	dc->brush==img;
  dc->brush=NULL;
  for (k=0;k<6;k++) {
    DCDepthBufRst(dc);
    DCClear(dc);
    switch (k) {
      case 0:
	res=GrEllipse(dc,11,9,17,8,0.25,1,0.5,4.0);
	break;
      case 1:
	res=GrRegPoly(dc,11,9,17,8,5,0.25,1,0.5,4.0);
	break;
      case 2:
	res=Gr2Bezier(dc,ctrl);
	break;
      case 3:
	res=Gr3Bezier(dc,ctrl);
	break;
      case 4:
	res=Gr2BSpline(dc,ctrl,7,TRUE);
	break;
      case 5:
	res=Gr3BSpline(dc,ctrl,7,TRUE);
	break;
    }
    "%d %016X %016X\n",res,Bitmap3Hash(dc),Depth3Hash(dc);
  }
  Mat4x4TranslationEqu(dc->r,3,4,7);
  dc->flags=DCF_TRANSFORMATION|DCF_SYMMETRY;
  DCClear(dc);
  res=GrPutChar3(dc,2,1,0,'A');
  "%d %016X\n",res,Bitmap3Hash(dc);
  DCDel(img);
  DCDel(dc);
}

Bitmap3;
