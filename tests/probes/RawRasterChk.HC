U0 RawRasterChk()
{
  I64 flags,start,i,j,hash=0xCBF29CE484222325;
  U8 *image=CAlloc(GR_WIDTH*GR_HEIGHT/8);
  CTextGlbls saved;
  MemCpy(&saved,&text,sizeof(CTextGlbls));
  text.raw_scrn_image=image;
  text.font=sys_font_std;
  text.cols=GR_WIDTH/FONT_WIDTH;
  text.rows=GR_HEIGHT/FONT_HEIGHT;
  for (flags=0;flags<16;flags++)
    for (start=0;start<4;start++) {
      MemSet(image,0,GR_WIDTH*GR_HEIGHT/8);
      text.raw_flags=flags;
      switch (start) {
	case 0: text.raw_col=0; break;
	case 1: text.raw_col=79; break;
	case 2: text.raw_col=4799; break;
	case 3: text.raw_col=4800; break;
      }
      RawPutChar('X');
      for (i=0;i<256;i++)
	RawPutChar(i);
      for (i=0;i<80;i++) {
	RawPutChar('A'+i%26);
	if (!(i&7)) RawPutChar('\t');
	if (!(i&15)) RawPutChar('\n');
	if (!(i&31)) RawPutChar(CH_BACKSPACE);
      }
      RawPutChar('$$');
      RawPutChar('R');
      RawPutChar('E');
      RawPutChar('D');
      RawPutChar('$$');
      RawPutChar('!');
      for (j=0;j<GR_WIDTH*GR_HEIGHT/8;j++)
	hash=(hash^image[j])*0x100000001B3;
      hash=(hash^text.raw_col)*0x100000001B3;
      hash=(hash^text.raw_flags)*0x100000001B3;
    }
  MemCpy(&text,&saved,sizeof(CTextGlbls));
  Free(image);
  "RawRaster:%016X\n",hash;
}

RawRasterChk;
