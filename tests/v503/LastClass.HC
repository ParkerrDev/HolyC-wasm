//A lastclass default is the class name of the argument before it.
class CPt
{
  I64 x,y;
};

U0 Show(U8 *d,U8 *class_name=lastclass)
{
  no_warn d;
  "%s\n",class_name;
}

U0 First(U8 *class_name=lastclass)
{
  "%d\n",class_name;
}

CPt pt,*ppt=&pt,**pppt=&ppt;
U8 buf[4];
I64 n;
F64 f;
Show(&pt);
Show(ppt);
Show(pppt);
Show(buf);
Show(&n);
Show(n);
Show(f);
Show(&pt,"given");
First;
