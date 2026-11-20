//V5.03 Spawn gives its entry one arg; a three-param entry still runs.
I64 got=0;
U0 Three(I64 a,I64 b,I64 c)
{
  no_warn b,c;
  got=a;
}
Spawn(&Three,7);
while (!got)
  Yield;
"%d\n",got;
