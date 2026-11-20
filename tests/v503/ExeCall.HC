//Text compiled at run time calls the program's functions and takes
//their addresses; what it defines, the program calls.
I64 Twice(I64 x)
{
  return 2*x;
}

I64 Call(I64 (*f)(I64 x),I64 v)
{
  return (*f)(v);
}

I64 cols=5;
"%d\n",Call(&Twice,21);
"%d\n",ExePrint("Twice(%d)+cols;",5);
ExePutS("U0 Late(){\"late %d\\n\",Twice(cols);}");
"defined\n";//V5.03 lexes one token ahead: Late cannot start this one.
Late;
"%d\n",Call(ExePutS("&Twice;"),4);
"%d\n",Call(ExePutS("&Late;")(U8 *)-ExePutS("&Late;")(U8 *)+&Twice,8);
