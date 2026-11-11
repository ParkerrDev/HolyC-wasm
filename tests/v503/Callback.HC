I64 trace,res;

I64 Add(I64 x,I64 y=5)
{
  return x+y;
}

I64 Mul(I64 x,I64 y)
{
  return x*y;
}

F64 Half(F64 x)
{
  return x/2;
}

I64 (*calc)(I64 x,I64 y=7)=&Add;
I64 (*choices)(I64 x,I64 y)[2]={&Add,&Mul};
I64 (**ptr)(I64,I64)=&calc;

class CCallback
{
  I64 (*calc)(I64 x,I64 y);
  F64 (*half)(F64 x);
} cb;

I64 Apply(I64 (*fn)(I64,I64),I64 x,I64 y)
{
  return fn(x,y);
}

I64 Mark(I64 n)
{
  trace=trace*10+n;
  return n;
}

I64 Switch()
{
  calc=&Mul;
  return 3;
}

I64 Report(I64 n)
{
  "%d\n",n+100;
  return n;
}

U0 Callback()
{
  I64 (*fn)(I64,I64);
  fn=&Mul;
  cb.calc=&Mul;
  cb.half=&Half;
  "%d %d %d\n",calc(2),Apply(&Mul,3,4),choices[1](5,6);
  "%d %d %0.2f\n",fn(3,7),cb.calc(8,9),cb.half(5.0);
  "%d %d\n",calc==&Add,*ptr==calc;
  trace=0;
  res=Add(Mark(1),Mark(2));
  "%d %d\n",trace,res;
  trace=0;
  res=fn(Mark(3),Mark(4));
  "%d %d\n",trace,res;
  trace=0;
  res=choices[Mark(1)](Mark(2),Mark(3));
  "%d %d\n",trace,res;
  res=calc(Switch,5);
  "%d\n",res;
  "%d %d\n",Report(1),Report(2);
}

Callback;
