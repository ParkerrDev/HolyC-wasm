U0 PaletteScreen()
{
  U8 img[256],cache[256],planes[128];
  I64 i,j,color;
  for (i=0;i<256;i++) img[i]=i;
  MemSet(cache,0xFF,256);
  MemSet(planes,0xA5,128);
  DCBlotColor4(planes,img,cache,32);
  "PalettePixels:";
  for (i=0;i<256;i++) {
    color=0;
    for (j=0;j<4;j++)
      if (Bt(planes+j*32,i)) color|=1<<j;
    "%X",color;
  }
  '\n';
}

PaletteScreen;
