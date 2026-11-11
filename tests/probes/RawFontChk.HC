U0 RawFontChk()
{
  I64 i,font_num,hash=0xCBF29CE484222325;
  U8 *image=CAlloc(GR_WIDTH*GR_HEIGHT/8);
  CTextGlbls saved;
  MemCpy(&saved,&text,sizeof(CTextGlbls));
  if (sizeof(CTextGlbls)!=88 || text.cols!=80 || text.rows!=60 ||
	text.font!=sys_font_std || text.aux_font!=sys_font_cyrillic)
    throw('RawFont');
  text.raw_scrn_image=image;
  text.raw_flags=RWF_SHOW_DOLLAR;
  for (font_num=0;font_num<2;font_num++) {
    MemSet(image,0,GR_WIDTH*GR_HEIGHT/8);
    text.raw_col=0;
    if (font_num) text.font=text.aux_font;
    RawPutChar('X');
    for (i=0;i<256;i++) {
      hash=(hash^text.font[i])*0x100000001B3;
      RawPutChar(i);
    }
    for (i=0;i<GR_WIDTH*GR_HEIGHT/8;i++)
      hash=(hash^image[i])*0x100000001B3;
  }
  MemCpy(&text,&saved,sizeof(CTextGlbls));
  Free(image);
  "RawFont:%016X\n",hash;
}

RawFontChk;
