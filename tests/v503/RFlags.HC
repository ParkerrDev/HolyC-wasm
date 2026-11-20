//V5.03's GetRFlags and SetRFlags: a task runs with IF set, and a lock is
//spun on with PAUSE.
I64 lock=0;

U0 RFlags()
{
  I64 old_flags=GetRFlags;
  "%X\n",old_flags&RFLAGG_NORMAL;
  PUSHFD
  CLI
  I64 masked=GetRFlags&RFLAGG_NORMAL;
  PUSHFD
  STI
  I64 enabled=GetRFlags&RFLAGG_NORMAL;
  POPFD
  I64 restored=GetRFlags&RFLAGG_NORMAL;
  while (LBts(&lock,0))
    PAUSE
  LBtr(&lock,0);
  POPFD
  "%X %X %X\n",masked,enabled,restored;
  SetRFlags(old_flags);
  "%X %d\n",GetRFlags&RFLAGG_NORMAL,lock;
}

RFlags;
