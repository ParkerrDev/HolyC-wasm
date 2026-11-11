I64 MyCore()
{
  return 3;
}

U0 CoreOverride()
{
  I64 (*core)();
  core=&MyCore;
  "%d %d %d\n",MyCore,MyCore(),(*core)();
}

CoreOverride;
