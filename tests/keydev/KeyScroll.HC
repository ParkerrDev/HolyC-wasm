I64 ks_phase=0,ks_mode=0,ks_calls=0,ks_error=0,
  ks_hash=0xCBF29CE484222325;
CTask *ks_parent;

Bool KeyScrollPut(I64 ch,I64 sc)
{
  if (ks_phase!=2) ks_error=1;
  ks_hash=(ks_hash^ch)*0x100000001B3;
  ks_hash=(ks_hash^sc)*0x100000001B3;
  ks_calls++;
  return TRUE;
}

U0 KeyScrollRelease(U8 *)
{
  while (!ks_phase) Yield;
  if (ks_calls ||
	Bt(&ks_parent->display_flags,DISPLAYf_NOT_RAW)==ToBool(ks_mode==2) ||
	Bt(&ks_parent->task_flags,TASKf_INPUT_FILTER_TASK)==ToBool(ks_mode==2))
    ks_error=2;
  ks_phase=2;
  kbd.scan_code&=~SCF_SCROLL;
}

U0 KeyScroll()
{//Focused ScrollLock delays output until another task releases it.
  CKeyDevGlbls saved;
  CTask *child,*old_focus=sys_focus_task;
  I64 old_scan=kbd.scan_code,old_display=Fs->display_flags,
	old_flags=Fs->task_flags;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  KeyDevAdd(&KeyScrollPut,NULL,10);
  ks_hash=0xCBF29CE484222325;
  ks_error=0;
  sys_focus_task=ks_parent=Fs;
  for (ks_mode=0;ks_mode<3;ks_mode++) {
    ks_calls=ks_phase=0;
    Raw(OFF);
    Silent(OFF);
    LBts(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
    kbd.scan_code|=SCF_SCROLL;
    child=Spawn(&KeyScrollRelease,,,,Fs);
    ks_phase=1;
    switch (ks_mode) {
      case 0: PutKey('Q',7); break;
      case 1: PutS("AB"); break;
      case 2: RawPrint(0,"R"); break;
    }
    while (TaskValidate(child)) Yield;
    if (ks_error || ks_phase!=2 || !ks_calls ||
	  kbd.scan_code&SCF_SCROLL || IsRaw ||
	  !Bt(&Fs->task_flags,TASKf_INPUT_FILTER_TASK))
      throw('Scroll');
    ks_hash=(ks_hash^ks_calls)*0x100000001B3;
  }
  ks_calls=0;
  kbd.scan_code|=SCF_SCROLL;
  Silent(ON);
  PutKey('X');PutS("Y");
  Silent(OFF);
  PutKey;PutS(NULL);
  if (ks_calls) throw('Silent');
  sys_focus_task=NULL;
  PutKey('N');PutS("F");
  if (ks_calls!=2 || !(kbd.scan_code&SCF_SCROLL)) throw('Focus');
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  kbd.scan_code=old_scan;
  Fs->display_flags=old_display;
  Fs->task_flags=old_flags;
  sys_focus_task=old_focus;
  "KeyScroll:%016X\n",ks_hash;
}
