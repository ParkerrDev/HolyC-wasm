//Adam/AMath.HC: Wrap, Sinh, Cosh and the Complex ops, and KernelA.HH's F64 constants.

Complex zeros[3];

U0 AMath()
{
  Complex a,b,c;
  "%X %X %X\n",F64_MAX(I64),F64_MIN(I64),U64_F64_MAX(I64);
  "%X %X %X %X\n",inf(I64),eps(I64),log2_e(I64),loge_2(I64);
  "%0.6f %0.6f %0.6f\n",Wrap(4.0),Wrap(-4.0,0),Wrap(10.0,1.0);
  "%0.6f %0.6f %0.6f\n",Sinh(1.5),Cosh(1.5),Cosh(-0.25);
  CEqu(&a,1.5,-2.0);
  CEqu(&b,-0.5,3.0);
  CAdd(&c,&a,&b);
  "%0.6f %0.6f\n",c.x,c.y;
  CSub(&c,&a,&b);
  "%0.6f %0.6f\n",c.x,c.y;
  CMul(&c,&a,&b);
  "%0.6f %0.6f\n",c.x,c.y;
  CDiv(&c,&a,&b);
  "%0.6f %0.6f\n",c.x,c.y;
  CScale(&c,2.5);
  "%0.6f %0.6f\n",c.x,c.y;
  CEqu(&zeros[0],1.0,-2.0);
  CEqu(&zeros[1],0.5,0.0);
  CEqu(&zeros[2],-1.0,1.0);
  CCopy(&c,&b);
  CPoly(&c,3,zeros,&a);
  "%0.6f %0.6f\n",c.x,c.y;
  CPoly(&c,0,zeros,&a);
  "%0.6f %0.6f\n",c.x,c.y;
}

AMath;
