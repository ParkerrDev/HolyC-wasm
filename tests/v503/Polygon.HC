U64 PolygonHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++) {
    hash=hash*65599+dc->body[i];
    if (dc->depth_buf) hash=hash*65599+dc->depth_buf[i];
  }
  return hash;
}

U0 PolygonResult(CDC *dc,I64 res)
{
  "%d %d %d %d %d %d %d %016X %016X\n",res,dc->collision_cnt,
	dc->min_x,dc->max_x,dc->min_y,dc->max_y,dc->nearest_dist,
	PolygonHash(dc),RandI64;
}

U0 PolygonInit(CDC *dc,I32 *db,I64 k)
{
  dc->depth_buf=db;
  DCDepthBufRst(dc);
  DCRst(dc);
  dc->flags=0;
  DCFill(dc,GREEN);
  dc->flags=DCF_RECORD_EXTENTS|DCF_LOCATE_NEAREST;
  dc->cur_x=18;dc->cur_y=13;dc->nearest_dist=I64_MAX;
  dc->min_x=dc->min_y=I64_MAX;
  dc->max_x=dc->max_y=I64_MIN;
  dc->color=(k%4)<<8+RED;dc->bkcolor=BLUE;
  if (k&4) dc->flags|=DCF_SCRN_BITMAP|DCF_ON_TOP;
  if (!(k&8)) dc->depth_buf=NULL;
  if (k&16) dc->flags|=DCF_DONT_DRAW;
  if (k&32) {
    dc->color.c1.color=YELLOW;
    if (k&64) dc->color.c1.rop=ROPBF_PROBABILITY_DITHER;
    else dc->color.c1.rop=ROPBF_DITHER;
  }
}

U0 Polygon()
{
  CDC *dc=DCNew(37,29);
  I32 *db=DCDepthBufAlloc(dc);
  CTask *task=CAlloc(sizeof(CTask));
  CD3I32 p[5];
  I64 i,k,res;
  task->pix_left=3;task->pix_right=32;
  task->pix_top=2;task->pix_bottom=25;
  task->scroll_x=1;task->scroll_y=-1;task->scroll_z=2;
  task->next_task=sys_winmgr_task;
  dc->win_task=task;
  Seed(73);
  for (k=0;k<512;k++) {
    for (i=0;i<3;i++) {
      p[i].x=RandU16%65-15;
      p[i].y=RandU16%55-12;
      p[i].z=RandU16%21-4;
    }
    if (k%16==0) {
      p[1].y=p[0].y;
      p[2].y=p[0].y;
    }
    if (k%16==1) {
      p[1].x=p[0].x;
      p[2].x=p[0].x;
    }
    if (k%16==2) MemCpy(&p[1],&p[0],sizeof(CD3I32));
    PolygonInit(dc,db,k);
    res=GrFillTri0(dc,&p[0],&p[1],&p[2]);
    PolygonResult(dc,res);
  }
  p[0].x=-3;p[0].y=4;p[0].z=7;
  p[1].x=16;p[1].y=-3;p[1].z=3;
  p[2].x=32;p[2].y=10;p[2].z=5;
  p[3].x=26;p[3].y=23;p[3].z=4;
  p[4].x=8;p[4].y=19;p[4].z=3;
  for (k=0;k<64;k++) {
    PolygonInit(dc,db,k);
    if (k&1) {
      Mat4x4RotZ(dc->r,0.25);
      dc->x=5;dc->y=3;dc->z=4;
      dc->flags|=DCF_TRANSFORMATION;
    }
    if (k&2) {
      DCSymmetrySet(dc,19,0,19,29);
      dc->flags|=DCF_SYMMETRY;
    }
    if (k&4) dc->flags|=DCF_JUST_MIRROR;
    res=GrFillPoly3(dc,5,p);
    res+=GrRect3(dc,4,6,8,11,9);
    PolygonResult(dc,res);
  }
  PolygonInit(dc,db,0);
  res=GrRectB(dc,23,21,3,-2);
  PolygonResult(dc,res);
  dc->depth_buf=db;
  DCDel(dc);
  Free(task);
}

Polygon;
