U0 RawDelayChk()
{//A diagnostic keeps output state intact through a nonzero busy interval.
  I64 i,hash=0xCBF29CE484222325,
	old_display=Fs->display_flags,old_task_flags=Fs->task_flags,
	old_scan=kbd.scan_code;
  F64 start;
  Bool waited;
  U8 *image=CAlloc(GR_WIDTH*GR_HEIGHT/8);
  CTextGlbls saved_text;
  CKeyDevGlbls saved_keydev;
  CSema saved_sema;

  MemCpy(&saved_text,&text,sizeof(CTextGlbls));
  MemCpy(&saved_keydev,&keydev,sizeof(CKeyDevGlbls));
  MemCpy(&saved_sema,&sys_semas[SEMA_FLUSH_VGA_IMAGE],sizeof(CSema));
  MemSet(&keydev,0,sizeof(CKeyDevGlbls));
  QueInit(&keydev.put_key_head);
  keydev.put_key_head.priority=0;
  KeyDevAdd(&KDInputFilterPutKey,&KDInputFilterPutS,0x40000000,FALSE);
  KeyDevAdd(&KDRawPutKey,&KDRawPutS,0x60000000,FALSE);
  kbd.scan_code&=~SCF_SCROLL;
  text.raw_scrn_image=image;
  text.font=sys_font_std;
  text.rows=60;
  text.cols=80;
  text.raw_col=0;
  text.raw_flags=RWF_SHOW_DOLLAR;
  Raw(OFF);
  Silent(OFF);
  LBts(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
  sys_semas[SEMA_FLUSH_VGA_IMAGE].val=0;
  start=tS;
  RawPrint(8,"Diagnostic:%04d",37);
  waited=tS-start>=0.007;
  if (IsRaw || IsSilent ||
	!Bt(&Fs->task_flags,TASKf_INPUT_FILTER_TASK))
    throw('RawFlags');
  for (i=0;i<GR_WIDTH*GR_HEIGHT/8;i++)
    hash=(hash^image[i])*0x100000001B3;
  hash=(hash^text.raw_col)*0x100000001B3;
  hash=(hash^sys_semas[SEMA_FLUSH_VGA_IMAGE].val)*0x100000001B3;
  while (keydev.put_key_head.next!=&keydev.put_key_head)
    KeyDevRem(keydev.put_key_head.next);
  MemCpy(&keydev,&saved_keydev,sizeof(CKeyDevGlbls));
  MemCpy(&text,&saved_text,sizeof(CTextGlbls));
  MemCpy(&sys_semas[SEMA_FLUSH_VGA_IMAGE],&saved_sema,sizeof(CSema));
  Fs->display_flags=old_display;
  Fs->task_flags=old_task_flags;
  kbd.scan_code=old_scan;
  Free(image);
  "RawDelay:%016X:%d\n",hash,waited;
}
