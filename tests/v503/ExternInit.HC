//Code that names a global by extern runs before its initializer.
extern U8 tbl[];
U0 Poke()
{
  tbl[0]=9;
}
Poke;
U8 tbl[3]={1,2,3};
U8 tab2[3]={4,5,6};
"%d %d %d\n",tbl[0],tbl[1],tab2[2];
