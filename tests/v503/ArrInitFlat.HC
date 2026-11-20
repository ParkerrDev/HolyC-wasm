//V5.03's PrsVarInit2: a flat list fills a 2-D array in order, an array
//with its own braces takes them, and a member array takes flat elements.
class Pt
{
  I64 x,y[2],z;
};

I64 a[3][2]={1,2,3,4,5,6};
I64 b=77;
I64 c[2][2]={{8,9},{10,11}};
U8 d[2][2][2]={1,2,3,4,5,6,7,8};
I64 e[2][3]={{1,2,3},4,5,6};
Pt p[2]={{1,2,3,4},{5,6,7,8}};
U8 s[2][4]={"ab","cd"};

U0 ArrInitFlat()
{
  I64 i;
  for (i=0;i<6;i++)
    "%d ",a[i/2][i&1];
  "b=%d\n",b;
  "%d %d %d %d\n",c[0][0],c[0][1],c[1][0],c[1][1];
  for (i=0;i<8;i++)
    "%d ",d[i/4][i/2&1][i&1];
  '\n';
  for (i=0;i<6;i++)
    "%d ",e[i/3][i%3];
  '\n';
  "%d %d %d %d %d %d %d %d\n",p[0].x,p[0].y[0],p[0].y[1],p[0].z,
	p[1].x,p[1].y[0],p[1].y[1],p[1].z;
  "%s %s\n",s[0],s[1];
}

ArrInitFlat;
