U0 VGAFlush()
{//Flush winmgr vga cache, so updates whole scrn.
  LBts(&sys_semas[SEMA_FLUSH_VGA_IMAGE],0);
}
