U0 LexFloatProbe(U8 *src)
{
  CCmpCtrl *cc=CmpCtrlNew(src,CCF_DONT_FREE_BUF);
  cc->htc.hash_table_lst=NULL;
  Lex(cc);
  "%s:%016X\n",src,cc->cur_f64(U64);
  CmpCtrlDel(cc);
}
LexFloatProbe("9007199254740993.0");
LexFloatProbe("9007199254740993e-1");
LexFloatProbe("9223372036854775807e-3");
LexFloatProbe("1234567890123456789e-7");
LexFloatProbe("999999999999999999e-15");
LexFloatProbe("1e-309");
LexFloatProbe("1e309");
LexFloatProbe("0e309");
