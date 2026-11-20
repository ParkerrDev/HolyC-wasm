I64 nums[11]={5,-3,9,1,7,2,8,2,-40,100,0};
U8 *names[6]={"Pear","Apple","Fig","Kiwi","Date","Lime"};

class Pt
{
  I32 x,y;
  U8 z;
} pts[5]={{4,1,0},{2,2,1},{9,3,2},{-1,4,3},{2,5,4}};

I64 NumCompare(I64 e1,I64 e2)
{
  return e1-e2;
}

I64 NameCompare(U8 **e1,U8 **e2)
{
  return StrCmp(*e1,*e2);
}

I64 PtCompare(Pt *e1,Pt *e2)
{
  return e1->x-e2->x;
}

U0 QSortTest()
{
  I64 i;
  QSortI64(nums,11,&NumCompare);
  for (i=0;i<11;i++)
    "%d ",nums[i];
  '\n';
  QSort(names,6,sizeof(U8 *),&NameCompare);
  for (i=0;i<6;i++)
    "%s ",names[i];
  '\n';
  QSort(pts,5,sizeof(Pt),&PtCompare);
  for (i=0;i<5;i++)
    "%d,%d ",pts[i].x,pts[i].y;
  '\n';
}

QSortTest;
