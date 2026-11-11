I64 argc=111,argv=222;

I64 VarScope(...)
{
  return argc*100+argv[0];
}

U0 VarNoWarn(...)
{
  no_warn argc,argv;
}

VarNoWarn;
"VarScope:%d:%d:%d\n",VarScope(7,11),argc,argv;
