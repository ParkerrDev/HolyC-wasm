#define FOUR	4

I64 base=100;
F64 half=0.5;

U0 Main()
{//Expressions compiled while the program runs, as a menu's are.
  CCmpCtrl *cc=CmpCtrlNew(
	"CH_ESC+1,'\\n'*FOUR,(3+FOUR)*5;base*2-1,7.5*half)half*3",
	CCF_DONT_FREE_BUF);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%d ",LexExpressionI64(cc);
  Lex(cc);
  "%5.2f\n",LexExpressionF64(cc);
  CmpCtrlDel(cc);
}

Main;
