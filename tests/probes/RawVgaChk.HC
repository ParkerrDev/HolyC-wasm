U0 RawVgaChk()
{
  I64 i,j,plane,flags,start,hash=0xCBF29CE484222325,failures=0,
	old_idx,old_map,old_mode;
  U8 *image=CAlloc(GR_WIDTH*GR_HEIGHT/8);
  CTextGlbls saved;
  MemCpy(&saved,&text,sizeof(CTextGlbls));
  text.raw_scrn_image=image;
  text.font=sys_font_std;
  text.cols=GR_WIDTH/FONT_WIDTH;
  text.rows=GR_HEIGHT/FONT_HEIGHT;
  PUSHFD
  CLI
  old_idx=InU8(0x3CE);
  OutU8(0x3CE,4);old_map=InU8(0x3CF);
  OutU8(0x3CE,5);old_mode=InU8(0x3CF);
  OutU8(0x3CF,old_mode&~8);
  for (flags=0;flags<16;flags+=4)
    for (start=0;start<2;start++) {
      MemSet(image,0,GR_WIDTH*GR_HEIGHT/8);
      OutU8(VGAP_IDX,VGAR_MAP_MASK);OutU8(VGAP_DATA,15);
      MemCpy(text.vga_alias,image,GR_WIDTH*GR_HEIGHT/8);
      text.raw_flags=flags;
      text.raw_col=start*4799;
      RawPutChar('X');
      for (i=0;i<256;i++)
	RawPutChar(i);
      RawPutChar('\t');RawPutChar('\n');RawPutChar(CH_BACKSPACE);
      for (plane=0;plane<4;plane++) {
	OutU8(0x3CE,4);OutU8(0x3CF,plane);
	for (j=0;j<GR_WIDTH*GR_HEIGHT/8;j++) {
	  if (text.vga_alias[j]!=image[j]) failures++;
	  hash=(hash^text.vga_alias[j])*0x100000001B3;
	}
      }
    }
  OutU8(0x3CE,4);OutU8(0x3CF,old_map);
  OutU8(0x3CE,5);OutU8(0x3CF,old_mode);
  OutU8(0x3CE,old_idx);
  POPFD
  MemCpy(&text,&saved,sizeof(CTextGlbls));
  Free(image);
  VGAFlush;
  "RawVga:%016X:%d\n",hash,failures;
}

RawVgaChk;
