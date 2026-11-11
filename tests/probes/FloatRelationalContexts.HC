F64 z=0.0;
F64 Ret(F64 d)
{
  return d;
}
U0 Pair(F64 a,F64 b)
{
  "%d%d%d%d%d%d",a==b,a!=b,a<b,a<=b,a>b,a>=b;
  if (a==b) '1'; else '0';
  if (a!=b) '1'; else '0';
  if (a<b) '1'; else '0';
  if (a<=b) '1'; else '0';
  if (a>b) '1'; else '0';
  if (a>=b) '1'; else '0';
  '\n';
}
U0 Zero(F64 d)
{
  "Z:%016X:%d%d%d%d%d%d:%d%d%d%d%d%d:%d%d%d%d\n",d(U64),
    d==0,d!=0,d<0,d<=0,d>0,d>=0,
    0==d,0!=d,0<d,0<=d,0>d,0>=d,
    Ret(d)<0,Ret(d)>0,-d<0,-d>0;
  "L:%d%d%d%d%d%d%d%d\n",d<0 && TRUE,TRUE && d<0,
    d<0 || FALSE,FALSE || d<0,d<0 ^^ FALSE,FALSE ^^ d<0,
    !d,!!d;
  "C:%d%d%d%d%d%d\n",d<0<1,0<d<1,d==0==0,
    d!=0!=0,0==d==0,0!=d!=0;
  'I';
  if (d) '1'; else '0';
  if (d<0) '1'; else '0';
  if (d<0 && TRUE) '1'; else '0';
  if (TRUE && d<0) '1'; else '0';
  if (d<0 || FALSE) '1'; else '0';
  if (FALSE || d<0) '1'; else '0';
  if (d<0<1) '1'; else '0';
  if (0<d<1) '1'; else '0';
  '\n';
}
U64 bits[8]={0,0x8000000000000000,0x3FF0000000000000,
  0xBFF0000000000000,0x7FF0000000000000,0xFFF0000000000000,
  0x7FF8000000000000,0xFFF8000000000000};
I64 i,j;
for (i=0;i<8;i++) {
  Zero(bits[i](F64));
  for (j=0;j<8;j++) Pair(bits[i](F64),bits[j](F64));
}
"Const:%d%d%d%d%d%d:%d%d\n",0.0==-0.0,0.0!=-0.0,
  -0.0<0.0,-0.0<=0.0,-0.0>0.0,-0.0>=0.0,
  !-0.0,!!-0.0;
