U0 Border()
{
  CDC *dc=DCNew(640,480);
  I64 x,y,cnt=0;
  U64 hash=0;
  dc->color=DKGRAY;
  GrBorder(dc,12,4,626,474);
  for (y=0;y<480;y++)
    for (x=0;x<640;x++) {
      hash=hash*65599+GrPeek(dc,x,y);
      if (GrPeek(dc,x,y)==DKGRAY) cnt++;
    }
  "%d %016X\n",cnt,hash;
  "%d %d %d %d\n",GrPeek(dc,12,4),GrPeek(dc,626,4),
	GrPeek(dc,12,474),GrPeek(dc,626,474);
  "%d %d %d %d\n",GrPeek(dc,13,5),GrPeek(dc,625,473),
	GrPeek(dc,627,474),GrPeek(dc,626,475);
  DCDel(dc);
}

Border;
