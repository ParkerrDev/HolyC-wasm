//Adam/Gr/GrAsm.HC DCBlotColor4, GrBitMap.HC GrBitMap4ToBitMap8 and
//GrDC.HC DCScrnCapture: the 4 planes of the screen and back to 8 bits.

U0 ScrnCaptureChk()
{
  I64 img[2],img_cache[2],i;
  U8 planes[8],pixels[16],*src=img;
  CDC *dc;
  for (i=0;i<16;i++)
    src[i]=i*7&15;
  MemSet(img_cache,0,sizeof(img_cache));
  MemSet(planes,0,sizeof(planes));
  DCBlotColor4(planes,img,img_cache,2);
  for (i=0;i<8;i++)
    "%02X ",planes[i];
  "\n%d\n",MemCmp(img,img_cache,sizeof(img));
  MemSet(planes,0,sizeof(planes));
  DCBlotColor4(planes,img,img_cache,2);
  for (i=0;i<8;i++)
    "%02X ",planes[i];
  '\n';
  DCBlotColor4(planes,img,MemSet(img_cache,0,sizeof(img_cache))-sizeof(img_cache),2);
  "%d\n",GrBitMap4ToBitMap8(pixels,planes,8,0)-pixels;
  for (i=0;i<16;i++)
    "%d ",pixels[i];
  '\n';

  gr.dc->color=RED;
  GrRect(gr.dc,16,300,24,10);
  gr.dc->color=LTCYAN;
  GrRect(gr.dc,500,40,5,7);
  Refresh(2,TRUE);
  for (i=0;i<2;i++) {
    dc=DCScrnCapture(!i);
    "%d %d %d %d %d %d\n",dc->width,dc->height,dc->width_internal,
	  dc->flags&DCF_SCRN_BITMAP,MSize(dc->body)>=GR_WIDTH*GR_HEIGHT,
	  dc->mem_task==Fs;
    "%d %d %d %d\n",GrPeek(dc,16,300),GrPeek(dc,39,309),
	  GrPeek(dc,500,40),GrPeek(dc,504,46);
    DCDel(dc);
  }
  DCFill;
}

ScrnCaptureChk;
