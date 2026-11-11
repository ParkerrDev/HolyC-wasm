U0 LexHostFail(CCmpCtrl *cc,U8 *reason,I64 code='Compiler')
{//Use the original debugger diagnostic only in the native comparison.
  if (code=='Compiler') LexExcept(cc,reason);
  throw(code);
}
