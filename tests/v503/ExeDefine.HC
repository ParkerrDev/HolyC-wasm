//A define and a global made at run time size a later global's array.
I64 Twice(I64 x)
{
  return 2*x;
}

U0 InitDefines()
{
  DefinePrint("ROWS","%d",Twice(2));
  DefinePrint("HALF","%5.3f",0.5);
} InitDefines;

I64 cols=ROWS+1;
U8 grid[ROWS][cols];
F64 h=HALF;

class Cell
{
  I64 x,y;
} cells[ROWS*2];

"%d %d %d %5.3f %d\n",sizeof(grid),ROWS,cols,h,sizeof(cells);
