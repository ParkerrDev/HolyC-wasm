U64 PenHash(CDC *dc)
{
  I64 i;
  U64 hash=0;
  for (i=0;i<dc->width_internal*dc->height;i++)
    hash=hash*65599+dc->body[i];
  return hash;
}

U0 Pen()
{
  I64 i,j;
  U64 lo,hi;
  for (i=0;i<GR_PEN_BRUSHES_NUM;i++) {
    lo=hi=0;
    for (j=0;j<GR_PEN_BRUSHES_NUM;j++) {
      lo=lo*65599+gr.circle_lo[i][j];
      hi=hi*65599+gr.circle_hi[i][j];
    }
    "%016X %016X %016X %016X %016X %016X\n",
	  PenHash(gr.pen_brushes[i]),PenHash(gr.collision_pen_brushes[i]),
	  PenHash(gr.even_pen_brushes[i]),PenHash(gr.odd_pen_brushes[i]),
	  lo,hi;
  }
}

Pen;
