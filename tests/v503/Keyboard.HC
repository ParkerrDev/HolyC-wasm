extern U0 KbdBuildSC(U8 raw_byte,Bool in_irq,
	U8 *_last_raw_byte,I64 *_last_sc);

U0 Keyboard()
{
  I64 i,j,k,flags,scan;
  U64 hash;
  U8 last;
  for (i=0;i<64;i++) {
    flags=i<<9;
    hash=0;
    for (j=-2;j<=257;j++)
      hash=hash*65599+Char2ScanCode(j,flags);
    for (j=0;j<256;j++)
      hash=hash*65599+ScanCode2Char(j|flags);
    "%d:%X\n",i,hash;
    if (!(flags&SCF_CTRL) || !(flags&SCF_ALT)) {
      hash=0;
      for (j=0;j<2;j++)
	for (k=0;k<256;k++) {
	  last=0;
	  if (j) last=0xE0;
	  scan=flags|flags<<32;
	  KbdBuildSC(k,TRUE,&last,&scan);
	  hash=(hash*65599+scan)*65599+last;
	}
      "sc:%X\n",hash;
    }
  }
}

Keyboard;
