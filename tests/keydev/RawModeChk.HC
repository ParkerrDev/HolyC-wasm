U0 RawModeChk()
{
  I64 flags,seed,value,step,hash=0xCBF29CE484222325,
	old_display=Fs->display_flags;
  CSema old_sema;
  MemCpy(&old_sema,&sys_semas[SEMA_FLUSH_VGA_IMAGE],sizeof(CSema));
  for (flags=0;flags<64;flags++)
    for (seed=0;seed<2;seed++) {
      Fs->display_flags=0x51234000|flags;
      sys_semas[SEMA_FLUSH_VGA_IMAGE].val=seed|0xA0;
      for (step=0;step<4;step++) {
	value=Raw(step&1);
	hash=(hash^value)*0x100000001B3;
	hash=(hash^IsRaw)*0x100000001B3;
	hash=(hash^Fs->display_flags)*0x100000001B3;
	hash=(hash^sys_semas[SEMA_FLUSH_VGA_IMAGE].val)*0x100000001B3;
      }
    }
  Fs->display_flags=old_display;
  MemCpy(&sys_semas[SEMA_FLUSH_VGA_IMAGE],&old_sema,sizeof(CSema));
  "RawMode:%016X:%d\n",hash,sizeof(CSema);
}
