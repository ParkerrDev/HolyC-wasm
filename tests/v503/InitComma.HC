class Pt
{
  I64 x,y;
};

Pt pts[3]={{1,2}{3 4},{5,6}};
I64 nums[3]={7 8,9};

U0 InitComma()
{//Initializer commas may be left out.
  I64 i;
  for (i=0;i<3;i++)
    "%d %d\n",pts[i].x,pts[i].y;
  for (i=0;i<3;i++)
    "%d\n",nums[i];
}

InitComma;
