I64 Plus(I64 x)
{
  return x+7;
}

U0 NativeSyntax()
{
  I64 i=0,reg j=1,noreg k=2,(*fn)(I64);
  U8 reg *ptr="Native",reg *end=ptr+6;
  fn=&Plus;
  "%d %d %d %d\n",i+j+k,end-ptr,(*fn)(8),*fn==fn;
  for (i=0;i<4;i++)
    switch [i] {
      case 0:
	"zero\n";
	break;
      case 1...2:
	"%d\n",i;
	break;
      case 3:
	"three\n";
	break;
    }
}

NativeSyntax;
