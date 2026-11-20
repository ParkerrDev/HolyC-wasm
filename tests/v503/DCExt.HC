U0 DCExtTest()
{
  CDC *dc=DCNew(16,8),*res;
  I64 x,y;
  DCFill(dc,WHITE);
  dc->color=RED;
  GrRect(dc,2,1,5,3);
  dc->color=BLUE;
  GrPlot(dc,9,6);
  res=DCExt(dc,10,7,1,0);
  "%d %d\n",res->width,res->height;
  for (y=0;y<res->height;y++) {
    for (x=0;x<res->width;x++)
      "%X",GrPeek0(res,x,y);
    '\n';
  }
  DCDel(res);
  DCDel(dc);
}

DCExtTest;
