U0 PaletteChk()
{
  I64 i,j,hash=0xCBF29CE484222325;
  CBGR48 c,saved[256],palette[COLORS_NUM];
  for (i=0;i<256;i++)
    saved[i]=GrPaletteColorGet(i);
  for (j=0;j<256;j++) {
    c=0;
    c.r=j*257;
    c.g=(255-j)*257;
    c.b=(j*173+61)&0xFFFF;
    for (i=0;i<3;i++) {
      GrPaletteColorSet(j-256+i*256,c);
      c=GrPaletteColorGet(j);
      hash=(hash^c)*0x100000001B3;
    }
  }
  GrPaletteSet(gr_palette_std);
  GrPaletteGet(palette);
  for (i=0;i<COLORS_NUM;i++)
    hash=(hash^palette[i])*0x100000001B3;
  for (i=0;i<256;i++)
    GrPaletteColorSet(i,saved[i]);
  "Palette:%016X\n",hash;
}

PaletteChk;
