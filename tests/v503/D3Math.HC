//Kernel/KMathA.HC: the CD3 routines.

U0 D3Show(CD3 *d)
{
  "%0.6f %0.6f %0.6f\n",d->x,d->y,d->z;
}

U0 D3Math()
{
  CD3 a,b,c;
  D3Equ(&a,1.0,-2.0,3.0);
  D3Equ(&b,0.5,4.0,-1.5);
  "%0.6f %0.6f %0.6f %0.6f\n",D3Norm(&a),D3NormSqr(&a),
	D3Dist(&a,&b),D3DistSqr(&a,&b);
  "%0.6f\n",D3Dot(&a,&b);
  D3Show(D3Cross(&c,&a,&b));
  D3Show(D3Add(&c,&a,&b));
  D3Show(D3Sub(&c,&a,&b));
  D3Show(D3Mul(&c,-2.0,&a));
  D3Show(D3Div(&c,&a,4.0));
  D3Show(D3AddEqu(D3Copy(&c,&a),&b));
  D3Show(D3SubEqu(&c,&b));
  D3Show(D3MulEqu(&c,3.0));
  D3Show(D3DivEqu(&c,6.0));
  D3Show(D3Unit(&c));
  D3Show(D3Unit(D3Zero(&c)));
  D3Show(D3Equ(&c));
}

D3Math;
