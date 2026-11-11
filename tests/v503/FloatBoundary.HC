F64 float_bounds[14]={1e,1e-,1e+2,1e +2,1e-2,1e -2,
      1.,1.E,1.E-,.5e,.5E-2,1e--2,1e-+2,1.e+2};

U0 FloatBoundary()
{
  I64 i;
  for (i=0;i<14;i++) "%016X\n",float_bounds[i](I64);
}

FloatBoundary;
