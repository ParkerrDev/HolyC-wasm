//A local array takes an expression, not a brace list (static ones do).
U0 F()
{
  I64 a[3]={1,2,3};
  "%d\n",a[1];
}
F;
