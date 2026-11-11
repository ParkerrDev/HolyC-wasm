I64 scope_value=11;

I64 Scope()
{
  I64 before=scope_value,scope_value=22;
  return before*100+scope_value;
}

"%d\n",Scope;
