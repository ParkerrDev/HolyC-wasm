I64 power_divisor=4;

U0 PowerDivide(I64 value,I64 div)
{
  I64 a=value,b=value,c=value,d=value,e=value;
  U64 u=value;
  a/=4;
  b%=4;
  c/=div;
  d%=div;
  e/=-0x8000000000000000;
  "%d:%d:%d:%d:%d:%d:%d:%d:%d:%d:%d:%d:%X:%X:%X\n",value,
	value/4,value/div,value/power_divisor,value/5,value/-4,
	value%4,a,b,c,d,e,u/4,u%4,value/0x8000000000000000;
  "%d:%d:%d:%X\n",value/0x8000000000000000<0,
	value/4(U64)<0,value/4(U64),value/0x8000000000000000>>1;
}

I64 i;
for (i=-9;i<=9;i++) PowerDivide(i,4);
PowerDivide(I64_MIN,4);
PowerDivide(I64_MAX,4);
"%d:%d:%d:%d:%d:%d\n",-9/4,-7/4,-1/4,-9%4,-7%4,-1%4;
