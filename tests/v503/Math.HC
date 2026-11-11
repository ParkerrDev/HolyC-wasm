F64 values[8]={-2.5,-1.5,-0.5,0.5,1.5,2.5,1e30,-1e30};

U0 Math()
{
  I64 i;
  F64 d,a,b,c;
  for (i=0;i<8;i++) {
    d=values[i];
    a=Floor(d);b=Ceil(d);c=Round(d);
    "%X %X %X\n",a(I64),b(I64),c(I64);
  }
  a=5.5%2.0;b=-5.5%2.0;c=1e20%3.0;
  "%X %X %X\n",a(I64),b(I64),c(I64);
  a%=1.0;
  "%0.2f %0.2f %0.2f\n",a,Trunc(-2.9),Sqrt(9.0);
  "%0.4f %0.4f\n",Arg(0,1),Arg(-1,0);
  "%d %d %d\n",RoundI64(-7,3),FloorI64(-7,3),CeilI64(-7,3);
  "%d %d %d\n",RoundI64(7,3),FloorI64(7,3),CeilI64(7,3);
  "%d %d %d\n",FloorU64(7,3),CeilU64(7,3),SqrI64(-3);
  "%0.2f %0.2f %0.2f\n",Saw(-3,2),FullSaw(1.5,2),Sqr(1.5);
}

Math;
