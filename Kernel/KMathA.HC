//V5.03 Kernel/KMathA.HC's CD3 routines are x87 asm. These are the same
//operations in HolyC, in his order. WASM F64 rounds each step where the
//x87 kept 80 bits until FSTP, so the last bit can differ.

public F64 D3Norm(CD3 *d)
{//Norm
  return Sqrt(d->x*d->x+d->y*d->y+d->z*d->z);
}

public F64 D3NormSqr(CD3 *d)
{//Norm Squared
  return d->x*d->x+d->y*d->y+d->z*d->z;
}

public F64 D3Dist(CD3 *d1,CD3 *d2)
{//Distance
  return Sqrt(Sqr(d1->x-d2->x)+Sqr(d1->y-d2->y)+Sqr(d1->z-d2->z));
}

public F64 D3DistSqr(CD3 *d1,CD3 *d2)
{//Distance Squared
  return Sqr(d1->x-d2->x)+Sqr(d1->y-d2->y)+Sqr(d1->z-d2->z);
}

public CD3 *D3Cross(CD3 *prod,CD3 *d1,CD3 *d2)
{//prod=d1xd2
  prod->x=d1->y*d2->z-d1->z*d2->y;
  prod->y=d1->z*d2->x-d1->x*d2->z;
  prod->z=d1->x*d2->y-d1->y*d2->x;
  return prod;
}

public F64 D3Dot(CD3 *d1,CD3 *d2)
{//d1 dot d2
  return d1->x*d2->x+d1->y*d2->y+d1->z*d2->z;
}

public CD3 *D3Add(CD3 *sum,CD3 *d1,CD3 *d2)
{//sum=d1+d2
  sum->x=d1->x+d2->x;
  sum->y=d1->y+d2->y;
  sum->z=d1->z+d2->z;
  return sum;
}

public CD3 *D3Sub(CD3 *diff,CD3 *d1,CD3 *d2)
{//diff=d1-d2
  diff->x=d1->x-d2->x;
  diff->y=d1->y-d2->y;
  diff->z=d1->z-d2->z;
  return diff;
}

public CD3 *D3Mul(CD3 *prod,F64 s,CD3 *d)
{//prod=s*d
  prod->x=s*d->x;
  prod->y=s*d->y;
  prod->z=s*d->z;
  return prod;
}

public CD3 *D3Div(CD3 *quot,CD3 *d,F64 s)
{//quot=d/s
  quot->x=d->x/s;
  quot->y=d->y/s;
  quot->z=d->z/s;
  return quot;
}

public CD3 *D3Zero(CD3 *dst)
{//To zero
  dst->x=0;
  dst->y=0;
  dst->z=0;
  return dst;
}

public CD3 *D3Copy(CD3 *dst,CD3 *src)
{//dst=src
  dst->x=src->x;
  dst->y=src->y;
  dst->z=src->z;
  return dst;
}

public CD3 *D3Equ(CD3 *dst,F64 x=0,F64 y=0,F64 z=0)
{//dst=(x,y,z)
  dst->x=x;
  dst->y=y;
  dst->z=z;
  return dst;
}

public CD3 *D3AddEqu(CD3 *sum,CD3 *d)
{//sum+=d
  sum->x+=d->x;
  sum->y+=d->y;
  sum->z+=d->z;
  return sum;
}

public CD3 *D3SubEqu(CD3 *diff,CD3 *d)
{//diff-=d
  diff->x-=d->x;
  diff->y-=d->y;
  diff->z-=d->z;
  return diff;
}

public CD3 *D3MulEqu(CD3 *prod,F64 s)
{//prod*=s
  prod->x*=s;
  prod->y*=s;
  prod->z*=s;
  return prod;
}

public CD3 *D3DivEqu(CD3 *quot,F64 s)
{//quot/=s
  quot->x/=s;
  quot->y/=s;
  quot->z/=s;
  return quot;
}

public CD3 *D3Unit(CD3 *d)
{//To unit vect
  F64 n=D3Norm(d);
  if (n(I64)) {
    d->x/=n;
    d->y/=n;
    d->z/=n;
  }
  return d;
}
