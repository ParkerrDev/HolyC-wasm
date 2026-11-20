//An expression compiled while the program runs calls its functions.
I64 Twice(I64 x)
{
  return 2*x;
}

F64 Half(F64 x)
{
  return x/2;
}

U0 Main()
{
  CCmpCtrl *cc=CmpCtrlNew("Twice(4)+1,Half(Twice(3)),&Twice==&Twice",
	CCF_DONT_FREE_BUF);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%5.2f ",LexExpressionF64(cc);
  Lex(cc);
  "%d\n",LexExpressionI64(cc);
  CmpCtrlDel(cc);
}

Main;
