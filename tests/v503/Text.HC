U64 TextHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++)
    hash=hash*65599+dc->body[i];
  return hash;
}

U0 Text()
{
  CDC *dc=DCNew(96,72);
  I64 k,res;
  for (k=0;k<64;k++) {
    DCRst(dc);
    DCFill(dc,BLUE);
    dc->flags=DCF_RECORD_EXTENTS;
    dc->min_x=dc->min_y=I64_MAX;
    dc->max_x=dc->max_y=I64_MIN;
    dc->color=YELLOW;
    if (k&1) dc->color=ROPF_DITHER+RED<<16+YELLOW;
    if (k&2) dc->flags|=DCF_DONT_DRAW;
    if (k&4) {
      Mat4x4RotZ(dc->r,0.125);
      dc->flags|=DCF_TRANSFORMATION;
      dc->x=3;dc->y=5;
    }
    if (k&8) dc->flags|=DCF_SYMMETRY;
    if (k&16) dc->flags|=DCF_JUST_MIRROR;
    if (k&32)
      res=GrPrint3(dc,-4,4,1,"[%03d] %.2f\n%s",37,0.125,"Ab\tCd");
    else
      res=GrPrint(dc,-4,4,"[%03d] %.2f\n%s",37,0.125,"Ab\tCd");
    "%d %d %d %d %d %016X\n",res,dc->min_x,dc->max_x,
	  dc->min_y,dc->max_y,TextHash(dc);
  }
  DCDel(dc);
}

Text;
