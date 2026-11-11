export const GR_PALETTE_SRC=String.raw`//V5.03 Adam/Gr/GrPalette uses six-bit VGA DAC components.

import U0 __gr_palette(I64 color_num,CBGR48 bgr48);

CBGR48 gr_palette_active[256];
Bool gr_palette_ready=FALSE;

U0 GrHostPaletteInit()
{
  I64 i;
  if (gr_palette_ready) return;
  MemSet(gr_palette_active,0,sizeof(gr_palette_active));
  gr_palette_ready=TRUE;
  for (i=0;i<COLORS_NUM;i++)
    GrPaletteColorSet(i,gr_palette_std[i]);
}

public U0 GrPaletteColorSet(I64 color_num,CBGR48 bgr48)
{//Quantize to the DAC, then notify the display device.
  GrHostPaletteInit;
  bgr48.r=0xFFFF*bgr48.r>>10/63;
  bgr48.g=0xFFFF*bgr48.g>>10/63;
  bgr48.b=0xFFFF*bgr48.b>>10/63;
  bgr48.pad=0;
  gr_palette_active[color_num.u8[0]]=bgr48;
  __gr_palette(color_num.u8[0],bgr48);
}

public CBGR48 GrPaletteColorGet(I64 color_num)
{
  GrHostPaletteInit;
  return gr_palette_active[color_num.u8[0]];
}

public U0 GrPaletteGet(CBGR48 *bgr48)
{
  I64 i;
  for (i=0;i<COLORS_NUM;i++)
    bgr48[i]=GrPaletteColorGet(i);
}

public U0 GrPaletteSet(CBGR48 *bgr48)
{
  I64 i;
  for (i=0;i<COLORS_NUM;i++)
    GrPaletteColorSet(i,bgr48[i]);
}

public U0 PaletteSetStd()
{
  GrPaletteSet(gr_palette_std);
}
`;
