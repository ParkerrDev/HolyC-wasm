
CCmpGlbls cmp;

U0 CmpLexHostInit()
{//Only lexical state is available; compiler-owned graphs remain absent.
  MemSet(&cmp,0,sizeof(CCmpGlbls));
}
