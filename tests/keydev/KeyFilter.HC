I64 kf_hash=0,kf_error=0;

U0 KeyFilterRecv(U8 *)
{//Read the three messages forwarded by the input-filter output device.
  I64 i,ch,sc,code;
  for (i=0;i<3;i++) {
    code=GetMsg(&ch,&sc,1<<MSG_KEY_DOWN);
    if (code!=MSG_KEY_DOWN || ch!='A'+i || sc!=i/2*9)
      kf_error=1;
    kf_hash=(kf_hash^ch)*0x100000001B3;
    kf_hash=(kf_hash^sc)*0x100000001B3;
  }
}

U0 KeyFilter()
{
  CKeyDevGlbls saved;
  CTask *child,*old_filter=Fs->last_input_filter_task;
  I64 old_scan=kbd.scan_code,old_display=Fs->display_flags,
	old_flags=Fs->task_flags;
  MemCpy(&saved,&keydev,sizeof(CKeyDevGlbls));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  KeyDevAdd(&KDInputFilterPutKey,&KDInputFilterPutS,0x40000000);
  KeyDevAdd(&KDRawPutKey,&KDRawPutS,0x60000000);
  kf_error=0;
  kf_hash=0xCBF29CE484222325;
  Raw(OFF);
  Silent(OFF);
  kbd.scan_code&=~SCF_SCROLL;
  child=Spawn(&KeyFilterRecv,,,,Fs);
  Fs->last_input_filter_task=child;
  LBts(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
  PutS("AB");
  PutKey('C',9);
  PutKey;
  Fs->last_input_filter_task=old_filter;
  Fs->task_flags=old_flags;
  while (TaskValidate(child)) Yield;
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved,sizeof(CKeyDevGlbls));
  kbd.scan_code=old_scan;
  Fs->display_flags=old_display;
  if (kf_error) throw('Filter');
  "KeyFilter:%016X\n",kf_hash;
}
