U0 PaletteChild()
{
  Sleep(100);
}

U0 FocusPalette()
{
  CTask *focus=sys_focus_task,*child;
  CBGR48 saved=GrPaletteColorGet(BLUE);
  child=Spawn(&PaletteChild);
  sys_focus_task=child;
  GrPaletteColorSet(BLUE,0);
  "%d ",GrPaletteColorGet(BLUE)==0;
  DeathWait(&child);
  "%d\n",GrPaletteColorGet(BLUE)==saved;
  sys_focus_task=focus;
}

if (sys_winmgr_task!=Fs)
  Suspend(sys_winmgr_task);
try FocusPalette;
catch if (sys_winmgr_task!=Fs) Suspend(sys_winmgr_task,FALSE);
if (sys_winmgr_task!=Fs)
  Suspend(sys_winmgr_task,FALSE);
