//Postfix casts. A value in memory is read again as the new type.
//A value in a register, a literal or a result keeps its bits.

class Pt
{
  I64 x,y;
} pt;

I64 g=0x12345678,h,arr[2];
F64 d=1.5;
U8 *p="ABC",g8;
Pt *pp=&pt;

I64 Twice(I64 n)
{
  return n*2;
}

U0 Regs()
{
  I64 a=0x1234,b;
  F64 f=2.5;
  b=a(U8);
  "%X %X %X\n",a(U8),b,0x1234(U8);
  "%X\n",f(I64);
  b=0x4004000000000000;
  "%5.2f\n",b(F64);
  "%c\n","0123456789ABCDEF"(U8 *)[13];
  "%X\n",Twice(0x91A)(U8);
}

g8=0x12F0;
arr[0]=0x5678;
pt.x=0x1234;
"%X %X %X\n",g(U8),(g)(U8),g;
h=g(U16);
"%X\n",h;
"%X\n",d(I64);
h=0x3FF8000000000000;
"%5.2f\n",h(F64);
"%d %d\n",-1(U8)<0,-1(U8)>200;
"%c %d\n",p(I64)(U8 *)[1],p(U16 *)[0]&0xFF;
"%d %d\n",g8,g8(I8);
"%X %X %X\n",arr(U8),pt.x(U8),pp->x(U8);
Regs;
