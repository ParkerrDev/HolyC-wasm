//StrMatch and StrIMatch, V5.03 Kernel/StrA.HC.
U8 *sm_hay="Hello, hello world";

U0 StrMatchTest()
{
  "%d %d %d %d\n",StrMatch("lo",sm_hay)-sm_hay,StrMatch("hello",sm_hay)-sm_hay,
	StrMatch("",sm_hay)-sm_hay,StrMatch("xyz",sm_hay);
  "%d %d %d\n",StrIMatch("HELLO",sm_hay)-sm_hay,StrIMatch("WoRlD",sm_hay)-sm_hay,
	StrIMatch("worlds",sm_hay);
  "%d %d\n",StrMatch("a",NULL),StrMatch(NULL,sm_hay);
  "%d %d\n",StrMatch("ld",sm_hay)-sm_hay,StrMatch("d",sm_hay)-sm_hay;
}

StrMatchTest;
