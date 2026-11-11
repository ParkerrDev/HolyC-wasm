I64 math_count=0,math_limit=I64_MAX;
U64 math_hash=0;

Bool MathPlot(U8 *,I64 x,I64 y,I64 z)
{
  math_hash=(math_hash*65599+x)*65599+y;
  math_hash=math_hash*65599+z;
  return ++math_count<math_limit;
}

U0 MathResult(Bool res)
{
  "%d %d %016X\n",res,math_count,math_hash;
  math_count=0;
  math_hash=0;
}

U0 GraphicsMath()
{
  I64 i,j,x,y,z,*r,*r2,ok;
  U64 hash;
  CDC *dc=DCNew(8,8);
  CD3I32 ctrl[7];
  for (i=0;i<13;i++) {
    r=Mat4x4IdentNew;
    Mat4x4RotX(r,(i-6)/8.0);
    Mat4x4RotY(r,(i%5-2)/4.0);
    Mat4x4RotZ(r,(i%7-3)/8.0);
    Mat4x4Scale(r,(i+1)/8.0);
    Mat4x4TranslationEqu(r,i-4,3-i,7-i);
    Mat4x4TranslationAdd(r,2,-3,4);
    r2=Mat4x4New(r);
    Mat4x4MulMat4x4Equ(r2,r,r);
    hash=0;
    for (j=0;j<16;j++) hash=hash*65599+r2[j];
    x=31-i;y=i-17;z=29;
    Mat4x4MulXYZ(r2,&x,&y,&z);
    "%016X %d %d %d\n",hash,x,y,z;
    Free(r);
    Free(r2);
  }
  for (i=0;i<7;i++) {
    ok=DCSymmetrySet(dc,i,2-i,3-i,i+4);
    x=13;y=-7;z=5;
    DCReflect(dc,&x,&y,&z);
    "%d %d %d %d %d %d\n",ok,dc->sym.snx,dc->sym.sny,x,y,z;
  }
  ok=DCSymmetrySet(dc,3,4,3,4);
  "%d %d %d\n",ok,dc->sym.sx,dc->sym.sy;
  for (i=0;i<3;i++) {
    dc->flags=0;
    if (i==1) {
      Mat4x4RotX(dc->r,0.25);
      Mat4x4RotY(dc->r,0.5);
      dc->x=3;dc->y=4;dc->z=5;
      dc->flags=DCF_TRANSFORMATION;
    }
    if (i==2)
      ok=DCSymmetry3Set(dc,0,0,0,1,0,0,2,0,0);
    else
      ok=DCSymmetry3Set(dc,1,2,3,4,3,1,2,7,-3);
    x=11;y=-17;z=23;
    DCReflect(dc,&x,&y,&z);
    "%d %d %d %d %d %d %d\n",ok,dc->sym.snx,dc->sym.sny,
	  dc->sym.snz,x,y,z;
  }
  dc->r_norm=0x180000000;
  for (i=0;i<4;i++) {
    dc->thick=i;
    dc->flags=DCF_TRANSFORMATION;
    DCThickScale(dc);
    "%d ",dc->thick;
  }
  "\n";
  for (i=0;i<7;i++) {
    ctrl[i].x=i*11-17;
    ctrl[i].y=i*i-13;
    ctrl[i].z=i%3-1;
  }
  "%d %d %0.6f %0.6f\n",D3I32DistSqr(ctrl,ctrl+4),
	D3I32NormSqr(ctrl),D3I32Dist(ctrl,ctrl+4),D3I32Norm(ctrl);
  for (i=0;i<3;i++) {
    math_limit=I64_MAX;
    if (i==2) math_limit=7;
    MathResult(Ellipse(NULL,3,-7,9,17,11,&MathPlot,i/8.0,i-1,0.25,4.0));
    MathResult(RegPoly(NULL,3,-7,9,17,11,5,&MathPlot,i/8.0,1,0.25,4.0));
    MathResult(Bezier2(NULL,ctrl,&MathPlot));
    MathResult(Bezier3(NULL,ctrl,&MathPlot));
    MathResult(BSpline2(NULL,ctrl,7,&MathPlot,i==1));
    MathResult(BSpline3(NULL,ctrl,7,&MathPlot,i==1));
  }
  DCDel(dc);
}

GraphicsMath;
