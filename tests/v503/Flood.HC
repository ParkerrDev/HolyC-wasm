U64 FloodHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++) {
    hash=hash*65599+dc->body[i];
    if (dc->depth_buf) hash=hash*65599+dc->depth_buf[i];
  }
  return hash;
}

U0 Flood()
{
  CDC *dc=DCNew(32,24),*brush=DCNew(2,2);
  I32 *db=DCDepthBufAlloc(dc);
  CTask *task=CAlloc(sizeof(CTask));
  I64 i,k,mode,res,z;
  task->pix_left=0;task->pix_right=31;
  task->pix_top=0;task->pix_bottom=23;
  task->scroll_x=1;task->scroll_y=-1;task->scroll_z=2;
  task->next_task=sys_winmgr_task;
  dc->win_task=task;
  for (mode=0;mode<2;mode++)
    for (k=0;k<256;k++) {
      dc->depth_buf=db;
      DCDepthBufRst(dc);
      DCRst(dc);
      dc->flags=0;
      DCFill(dc,BLUE);
      dc->color=WHITE;
      GrRect(dc,2,2,28,1);GrRect(dc,2,21,28,1);
      GrRect(dc,2,2,1,20);GrRect(dc,29,2,1,20);
      GrRect(dc,16,2,1,20);GrRect(dc,2,12,28,1);
      for (i=0;i<dc->height;i++) db[i*dc->width_internal+11]=0;
      dc->flags=DCF_RECORD_EXTENTS|DCF_LOCATE_NEAREST;
      dc->cur_x=15;dc->cur_y=8;dc->nearest_dist=I64_MAX;
      dc->min_x=dc->min_y=I64_MAX;
      dc->max_x=dc->max_y=I64_MIN;
      if (k&1) dc->flags|=DCF_SCRN_BITMAP|DCF_ON_TOP;
      if (!(k&2)) dc->depth_buf=NULL;
      if (k&4) dc->flags|=DCF_DONT_DRAW;
      dc->color=RED;
      if (k&8) dc->color=WHITE;
      else if (k&16) {
	dc->color.c1.color=YELLOW;
	if (k&32) dc->color.c1.rop=ROPBF_PROBABILITY_DITHER;
	else dc->color.c1.rop=ROPBF_DITHER;
      }
      if (k&64) {
	Mat4x4RotZ(dc->r,0.125);
	dc->x=2;dc->y=1;dc->z=3;
	dc->flags|=DCF_TRANSFORMATION;
      }
      if (k&128) {
	DCSymmetrySet(dc,15,0,15,24);
	dc->flags|=DCF_SYMMETRY;
	if (k&1) dc->flags|=DCF_JUST_MIRROR;
      }
      dc->color2=PURPLE;
      dc->brush=brush;
      if (k&32) z=-2;
      else z=5;
      Seed(67);
      if (mode) res=GrFloodFill3(dc,5,5,z,ToBool(k&8));
      else res=GrFloodFill(dc,5,5,ToBool(k&8));
      "%d %d %d %d %d %d %d %d %d %016X %016X\n",res,
	    dc->flags,dc->min_x,dc->max_x,dc->min_y,dc->max_y,
	    dc->nearest_dist,dc->brush==brush,dc->color2,
	    FloodHash(dc),RandI64;
    }
  dc->brush=NULL;
  dc->depth_buf=db;
  DCDel(dc);DCDel(brush);
  Free(task);
}

Flood;
