//A comma ends a statement as ; does, so a for header may list
//several, and an if holds every statement up to the ;.

U0 Comma()
{
  I64 i,j,s=0;
  for (i=0,j=10;i<3;i++,j+=2)
    s+=j;
  "%d %d %d\n",i,j,s;
  i=1,j=2;
  "%d %d\n",i,j;
  if (0)
    i=7,j=8;
  "%d %d\n",i,j;
}

Comma;
