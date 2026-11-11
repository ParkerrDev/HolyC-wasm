U64 SpanHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++)
    hash=hash*65599+dc->body[i];
  return hash;
}

U64 SpanDepth(CDC *dc)
{
  I64 i;
  U64 hash=0;
  if (dc->depth_buf)
    for (i=0;i<dc->width_internal*dc->height;i++)
      hash=hash*65599+dc->depth_buf[i];
  return hash;
}

U0 Span()
{
  CDC *dc=DCNew(29,23);
  I32 *db=DCDepthBufAlloc(dc);
  CTask *task=CAlloc(sizeof(CTask));
  I64 i,k,mode,res;
  task->pix_left=3;task->pix_right=24;
  task->pix_top=2;task->pix_bottom=19;
  task->scroll_x=1;task->scroll_y=-1;task->scroll_z=2;
  task->next_task=sys_winmgr_task;
  for (mode=0;mode<8;mode++)
    for (k=0;k<32;k++) {
      dc->depth_buf=db;
      DCDepthBufRst(dc);
      DCRst(dc);
      dc->flags=0;
      DCFill(dc,GREEN);
      for (i=0;i<dc->width_internal*dc->height;i+=5)
	dc->body[i]=TRANSPARENT;
      dc->flags=DCF_RECORD_EXTENTS|DCF_LOCATE_NEAREST;
      dc->cur_x=13;dc->cur_y=11;dc->nearest_dist=I64_MAX;
      dc->min_x=dc->min_y=I64_MAX;
      dc->max_x=dc->max_y=I64_MIN;
      dc->win_task=task;
      if (k&1) dc->flags|=DCF_SCRN_BITMAP|DCF_ON_TOP;
      if (k&2) dc->flags|=DCF_DONT_DRAW;
      if (!(k&4)) dc->depth_buf=NULL;
      dc->color=(mode&3)<<8+RED;
      dc->bkcolor=BLUE;
      if (mode&4) {
	dc->color.c1.color=YELLOW;
	if (k&8) dc->color.c1.rop=ROPBF_PROBABILITY_DITHER;
	else dc->color.c1.rop=ROPBF_DITHER;
      }
      Seed(97);
      if (k&16) {
	res=GrVLine(dc,8,-7,28,-3,27);
	res+=GrVLine(dc,8,29,-9,8,19);
	res+=GrVLine(dc,13,6,6,4,4);
	res+=GrVLine(dc,-2,6,11,0,0);
      } else {
	res=GrHLine(dc,-7,38,8,-3,27);
	res+=GrHLine(dc,40,-9,8,8,19);
	res+=GrHLine(dc,13,13,6,4,4);
	res+=GrHLine(dc,3,9,-2,0,0);
      }
      "%d %d %d %d %d %d %d %016X %016X %016X\n",res,
	    dc->collision_cnt,dc->min_x,dc->max_x,dc->min_y,dc->max_y,
	    dc->nearest_dist,SpanHash(dc),SpanDepth(dc),RandI64;
    }
  dc->depth_buf=db;
  DCDepthBufRst(dc);
  DCRst(dc);
  dc->flags=DCF_TRANSFORMATION|DCF_SYMMETRY;
  DCFill(dc,BLUE);
  Mat4x4RotZ(dc->r,0.25);
  DCSymmetrySet(dc,13,0,13,23);
  for (i=0;i<32;i++) GrPlot3B(dc,i,i/2,i%4);
  "%016X %016X %d\n",SpanHash(dc),SpanDepth(dc),dc->flags;
  DCDel(dc);
  Free(task);
}

Span;
