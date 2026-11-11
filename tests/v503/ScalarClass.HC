U16 class CWord
{
  U8 lo,hi;
};

U32 class CColor
{
  CWord first,second;
};

I32 class CSigned
{
  U16 lo,hi;
};

F64 class CReal
{
  I64 bits;
};

CColor colors[3]={0x12345678,0xFEDCBA98,0};
CSigned negative=0xFEDCBA98;

CColor Paint(CColor color)
{
  color.first.hi=0xAB;
  return color;
}

U0 ScalarClass()
{
  CColor color;
  CReal real;
  color=colors[0];
  real=2.5;
  "%d %d %d\n",sizeof(CWord),sizeof(CColor),sizeof(CReal);
  "%X %X %X %X\n",color,color.first,color.first.lo,color.second.hi;
  color.second.lo=0xEF;
  color.first.hi++;
  "%X %X\n",color,Paint(color);
  "%d %X %X\n",negative,negative.lo,negative.hi;
  "%X %0.2f\n",real.bits,real+1.0;
  colors[2]=Paint(colors[1]);
  "%X %X %d\n",colors[1],colors[2],colors+2-colors;
}

ScalarClass;
