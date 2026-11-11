F64 truth_zero=0.0;
class CTruthValue
{
  F64 value;
};
U64 truth_bits[12]={0,0x8000000000000000,0x3FF0000000000000,
  0xBFF0000000000000,0x7FF0000000000000,0xFFF0000000000000,
  1,0x8000000000000001,0x7FF8000000000000,0xFFF8000000000000,
  0x7FF8000000000012,0x7FF0000000000013};

F64 TruthRet(F64 d)
{
  return d;
}

U0 TruthPair(F64 a,F64 b)
{
  "%d%d%d%d",a==b,a!=b,!!a,!!b;
  if (a==b) '1'; else '0';
  if (a!=b) '1'; else '0';
  if (a) '1'; else '0';
  if (b) '1'; else '0';
  "%d%d\n",a==b==a,a!=b!=a;
}

U0 TruthZero(F64 d)
{
  F64 buf[1];
  U64 bits=d(U64);
  CTruthValue value;
  buf[0]=d;
  value.value=d;
  "Z:%016X:%d%d%d%d:%d%d%d%d:%d%d%d%d\n",d(U64),
    d<0,d>=0,0<d,0>=d,d<0.0,d>=0.0,0.0<d,0.0>=d,
    buf[0]<0,buf[0]>=0,*buf<0,*buf>=0;
  "D:%d%d%d%d:%d%d\n",value.value<0,value.value>=0,
    bits(F64)<0,bits(F64)>=0,
    d<1.0-1.0,d>=1.0-1.0;
  'I';
  if (d<0) '1'; else '0';
  if (d>=0) '1'; else '0';
  if (0<d) '1'; else '0';
  if (0>=d) '1'; else '0';
  '\n';
}

U0 TruthFinite(F64 d)
{
  "F:%d%d%d%d:%d%d%d%d%d%d:%d%d%d%d:%d%d\n",
    d<truth_zero,d>=truth_zero,d<-0.0,d>=-0.0,
    d<0 && TRUE,TRUE && d<0,d<0 || FALSE,FALSE || d<0,
    d<0 ^^ FALSE,FALSE ^^ d<0,
    TruthRet(d)<0,TruthRet(d)>=0,-d<0,-d>=0,d<1-1,d>=1-1;
  "C:%d%d%d%d%d%d\n",d<0<1,0<d<1,d==0==0,
    d!=0!=0,0==d==0,0!=d!=0;
  'I';
  if (d) '1'; else '0';
  if (d<0 && TRUE) '1'; else '0';
  if (TRUE && d<0) '1'; else '0';
  if (d<0 || FALSE) '1'; else '0';
  if (FALSE || d<0) '1'; else '0';
  if (d<0<1) '1'; else '0';
  '\n';
}

U0 FloatTruth()
{
  I64 i,j;
  for (i=0;i<12;i++) {
    TruthZero(truth_bits[i](F64));
    if (i<8) TruthFinite(truth_bits[i](F64));
    for (j=0;j<12;j++)
      TruthPair(truth_bits[i](F64),truth_bits[j](F64));
  }
  "Const:%d%d%d%d%d%d:%d%d\n",0.0==-0.0,0.0!=-0.0,
    -0.0<0.0,-0.0<=0.0,-0.0>0.0,-0.0>=0.0,
    !-0.0,!!-0.0;
}

FloatTruth;
