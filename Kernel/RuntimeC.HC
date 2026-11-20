

public I64 DistSqrI64(I64 x1,I64 y1,I64 x2,I64 y2)
{
  return SqrI64(x2-x1)+SqrI64(y2-y1);
}

public U0 SwapI64(I64 *a,I64 *b)
{
  I64 tmp=*a;
  *a=*b;*b=tmp;
}

public U0 SwapU16(U16 *a,U16 *b)
{
  U16 tmp=*a;
  *a=*b;*b=tmp;
}

public U0 SwapU32(U32 *n1,U32 *n2)
{//Swap two U32s. Not atomic.
  U32 tmp=*n1;
  *n1=*n2;*n2=tmp;
}

public U0 SwapU8(U8 *n1,U8 *n2)
{//Swap two U8s. Not atomic.
  U8 tmp=*n1;
  *n1=*n2;*n2=tmp;
}

public U16 *MemSetU16(U16 *dst,I64 val,I64 U16cnt)
{//Set chunk of U16s to value. REP_STOSW in V5.03 Kernel/KUtils.HC.
  while (U16cnt-->0) *dst++=val;
  return dst;
}

public U32 *MemSetU32(U32 *dst,I64 val,I64 cnt)
{
  U32 *res=dst+cnt;
  while (cnt-->0) *dst++=val;
  return res;
}

U0 __gr_sync(CDC *dc,I64 x,I64 y,I64 w,I64 h)
{//Publish a changed part of the screen bitmap to the host display.
  if (dc->body!=gr.dc->body || dc->flags&DCF_DONT_DRAW) return;
  if (dc->flags&DCF_SCRN_BITMAP) {
    x+=dc->win_task->pix_left+dc->win_task->scroll_x;
    y+=dc->win_task->pix_top+dc->win_task->scroll_y;
  }
  __gr_update(dc->body,dc->width_internal,x,y,w,h);
}

public I64 GrRect(CDC *dc=gr.dc,I64 x,I64 y,I64 w,I64 h)
{
  I64 res=__GrRect(dc,x,y,w,h);
  if (res) __gr_sync(dc,x,y,w,h);
  return res;
}

public I64 GrFloodFill(CDC *dc=gr.dc,I64 x,I64 y,
        Bool not_color=FALSE,I64 z=0,I32 *db=NULL)
{
  I64 res=__GrFloodFill(dc,x,y,not_color,z,db);
  if (res && dc->body==gr.dc->body)
    __gr_update(dc->body,dc->width_internal,0,0,dc->width,dc->height);
  return res;
}

public I64 GrHLine(CDC *dc=gr.dc,I64 x1,I64 x2,I64 y,I64 z1=0,I64 z2=0)
{
  I64 res=__GrHLine(dc,x1,x2,y,z1,z2);
  if (res && dc->depth_buf)
    __gr_sync(dc,MinI64(x1,x2),y,AbsI64(x2-x1)+1,1);
  return res;
}

public I64 GrVLine(CDC *dc=gr.dc,I64 x,I64 y1,I64 y2,I64 z1=0,I64 z2=0)
{
  I64 res=__GrVLine(dc,x,y1,y2,z1,z2);
  if (res && dc->depth_buf)
    __gr_sync(dc,x,MinI64(y1,y2),1,AbsI64(y2-y1)+1);
  return res;
}

public I64 GrBlot(CDC *dc=gr.dc,I64 x,I64 y,CDC *img)
{
  I64 res=__GrBlot(dc,x,y,img);
  if (res) __gr_sync(dc,x,y,img->width,img->height);
  return res;
}

public I64 GrPutChar(CDC *dc=gr.dc,I64 x,I64 y,U8 ch)
{
  I64 res=__GrPutChar(dc,x,y,ch);
  if (res) __gr_sync(dc,x,y,FONT_WIDTH,FONT_HEIGHT);
  return res;
}

public U0 GrBorder(CDC *dc=gr.dc,I64 x1,I64 y1,I64 x2,I64 y2,
	I64 step=1,I64 start=0)
{//2D. Transformation with thick.
//Can be used with ROPF_DITHER+WHITE<<16+BLACK for dotted rect.
  GrLine3(dc,x1,y1,0,x2,y1,0,step,start);
  GrLine3(dc,x2,y1,0,x2,y2,0,step,start);
  GrLine3(dc,x2,y2,0,x1,y2,0,step,start);
  GrLine3(dc,x1,y2,0,x1,y1,0,step,start);
}

U0 GrSprite(CDC *dc,I64 x,I64 y,U8 *image,I64 w,I64 h,I64 scale=1)
{//Legacy web bitmap helper; native programs use GrBlot.
  I64 xx,yy;
  CColorROPU32 old_color;
  if (!dc) dc=gr.dc;
  old_color=dc->color;
  if (scale<1) scale=1;
  for (yy=0;yy<h;yy++)
    for (xx=0;xx<w;xx++)
      if (image[yy*w+xx]!=TRANSPARENT) {
        dc->color=image[yy*w+xx];
        GrRect(dc,x+xx*scale,y+yy*scale,scale,scale);
      }
  dc->color=old_color;
}

U0 GrUpdateVGAGraphics()
{//Update Graphic Card. The host shows gr.dc2, his gr.dc1 with no zoom.
  MemCpy(gr.scrn_image->body,gr.dc1->body,gr.dc1->height*gr.dc1->width_internal>>1);
  __gr_update(gr.dc2->body,gr.dc2->width_internal,0,0,
	gr.dc2->width,gr.dc2->height);
  __gr_flip;
}

CBlkPool *sys_code_bp,*sys_data_bp;

U0 HeapHostInit()
{//The host's pool. Data shares it, as V5.03 with no sys_data_bp.
  sys_code_bp=__heap_bp;
  sys_data_bp=NULL;
}

U0 Free(U8 *addr)
{//Free $LK,"MAlloc",A="MN:MAlloc"$()ed memory chunk.
  __free(addr);
}

I64 MSize(U8 *src)
{//Size of heap object.
  return __msize(src);
}

I64 MSize2(U8 *src)
{//Internal size of heap object.
  return __msize2(src);
}

CHeapCtrl *MHeapCtrl(U8 *src)
{//$LK,"CHeapCtrl",A="MN:CHeapCtrl"$ of object.
  if (!src) return NULL;
  return (src-sizeof(CHeapBlk))(CHeapBlk *)->hc;
}

U8 *MAlloc(I64 size,CTask *mem_task=NULL)
{//Accepts a $LK,"CTask",A="MN:CTask"$ or $LK,"CHeapCtrl",A="MN:CHeapCtrl"$. NULL allocs off current task's heap.
  U8 *res;
  CHeapCtrl *hc=mem_task;
  if (!hc) hc=Fs;
  if (hc) {//No Fs before a plain host's boot, and no task heaps after it.
    if (hc(CTask *)->task_signature==TASK_SIGNATURE_VAL)
      hc=hc(CTask *)->data_heap;
    else if (hc->hc_signature!=HEAP_CTRL_SIGNATURE_VAL)
      throw('BadHeap',TRUE);
  }
  if (!(res=__malloc(size,hc)))
    throw('OutMem',TRUE);
  return res;
}

U8 *AMAlloc(I64 size)
{//Alloc memory in Adam's heap.
  return MAlloc(size,adam_task);
}

U8 *CAlloc(I64 size,CTask *mem_task=NULL)
{//Accepts a $LK,"CTask",A="MN:CTask"$ or $LK,"CHeapCtrl",A="MN:CHeapCtrl"$.  NULL allocs off current task's heap.
  U8 *res=MAlloc(size,mem_task);
  MemSet(res,0,size);
  return res;
}

U8 *ACAlloc(I64 size)
{//Alloc and set to zero memory in Adam's heap.
  return CAlloc(size,adam_task);
}

U8 *MAllocIdent(U8 *src,CTask *mem_task=NULL)
{//Accepts a $LK,"CTask",A="MN:CTask"$ or $LK,"CHeapCtrl",A="MN:CHeapCtrl"$.  NULL allocs off current task's heap.
  U8 *res;
  I64 size;
  if (!src) return NULL;
  size=MSize(src);
  res=MAlloc(size,mem_task);
  MemCpy(res,src,size);
  return res;
}

U8 *AMAllocIdent(U8 *src)
{//Alloc in Adam's heap, ident copy of heap node.
  return MAllocIdent(src,adam_task);
}

//==================== runtime init (called by __rt_init) ====================
U0 __hcrt_init()
{
  Fs=&fs_storage;
  Fs->addr=Fs;
  Fs->task_signature=TASK_SIGNATURE_VAL;
  Fs->rflags=RFLAGG_NORMAL;
  Fs->pix_width=__gr_width;
  Fs->pix_height=__gr_height;
  Fs->pix_right=Fs->pix_width-1;
  Fs->pix_bottom=Fs->pix_height-1;
  Fs->win_width=(Fs->pix_width+FONT_WIDTH-1)/FONT_WIDTH;
  Fs->win_height=(Fs->pix_height+FONT_HEIGHT-1)/FONT_HEIGHT;
  Fs->win_right=Fs->win_width-1;
  Fs->win_bottom=Fs->win_height-1;
  Fs->display_flags=1<<DISPLAYf_SHOW|1<<DISPLAYf_NO_BORDER|
	1<<DISPLAYf_NOT_RAW; //As $LK,"DocTermNew",A="MN:DocTermNew"$'s Raw(OFF) leaves a terminal task.
  Fs->text_attr=WHITE<<4+BLUE; //As $LK,"TaskInit",A="MN:TaskInit"$ gives every task.
  Fs->next_task=Fs->last_task=sys_winmgr_task=Fs;
  sys_focus_task=Fs;
  Fs->next_child_task=Fs->last_child_task=
        (&Fs->next_child_task)(U8 *)-offset(CTask.next_sibling_task);
  Fs->next_input_filter_task=Fs->last_input_filter_task=Fs;
  JobCtrlInit(&Fs->srv_ctrl);
  QueInit(&Fs->next_ctrl);
  QueInit(&Fs->next_ode);
  adam_task=Fs;
  LBts(&sys_run_level,RLf_VGA); //V5.03 KStart16.HC sets it at boot.
  adam_task->gs=cpu_structs;
  CPUStructInit(0,cpu_structs,adam_task);
}

U0 TaskHostUserCmdLine(I64 dummy=0)
{//V5.03 UserCmdLine (KTask.HC), with the host's program as its cmd line.
  no_warn dummy;
//The page is the desktop and the program its one window, WinMax'd as V5.03's
//Start.HC runs a game: row 0 stays the Window Mgr's.
  WinMax;
  Fs->win_inhibit=WIG_USER_TASK_DFT;
  CallExtStr("UserStartUp");
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  __task_user(NULL); //The program's entry.
//V5.03 goes on to the next prompt, where the Window Mgr shows the doc. Here
//the run ends after the Window Mgr's next frame.
  Refresh;
}

U0 TaskHostUser()
{//The host's choice: its program is a user task's cmd line. V5.03 StartOS.HC
//spawns the Window Mgr and User, and Adam serves jobs (SrvTaskCont).
  WinVert(2,10);
  if (sys_winmgr_task==adam_task)
    sys_winmgr_task=Spawn(&WinMgrTask,NULL,"Window Mgr");
  Fs->win_inhibit=WIG_TASK_DFT-WIF_SELF_BORDER
	-WIF_SELF_GRAB_SCROLL-WIF_SELF_CTRLS;
  LBts(&Fs->display_flags,DISPLAYf_CHILDREN_NOT_ON_TOP);
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  while (!Bt(&sys_run_level,RLf_WINMGR)) //V5.03's RegInit reads the disk
    Yield; //here, as long as the Window Mgr takes to start.
  WallPaperInit;
  __task_user(Spawn(&TaskHostUserCmdLine,NULL,"Term"));
  SrvTaskCont;
}

U0 __hgr_init()
{
  I64 i,j,bits;
  gr.dc=&gr_dc_storage;
  gr.dc->width=gr.dc->width_internal=GR_WIDTH;
  gr.dc->height=GR_HEIGHT;
  gr.dc->body=gr_scrn_bitmap;
  gr.dc->r=gr_scrn_r;
  gr.dc->win_task=gr.dc->mem_task=Fs;
  gr.dc->dc_signature=DCS_SIGNATURE_VAL;
  gr.dc->flags=DCF_SCRN_BITMAP|DCF_ON_TOP;
  MemSet(gr.dc->body,TRANSPARENT,GR_WIDTH*GR_HEIGHT); //His DCFill.
  gr.dc2=&gr_dc2_storage; //V5.03 GrInit2's DCNew, as storage.
  gr.dc2->width=gr.dc2->width_internal=GR_WIDTH;
  gr.dc2->height=GR_HEIGHT;
  gr.dc2->body=gr_scrn_bitmap2;
  gr.dc2->r=gr_scrn_r2;
  gr.dc2->win_task=gr.dc2->mem_task=Fs;
  gr.dc2->dc_signature=DCS_SIGNATURE_VAL;
  gr.dc2->flags=DCF_SCRN_BITMAP;
  gr.text_base=gr_text_base;
  gr.win_uncovered_bitmap=gr_win_uncovered_bitmap;
  gr.highest_uncovered=0;
  gr.win_z_buf=gr_win_z_buf;
  gr.scrn_zoom=1;
  gr.to_8_bits=gr_to_8_bits;
  gr.to_8_colors=gr_to_8_colors;
  __gr_font=sys_font_std;
  for (i=0;i<256;i++) {
    bits=0;
    for (j=0;j<8;j++) {
      gr.to_8_colors[i]|=i<<(j*8);
      if (i&1<<j) bits|=0xFF<<(j*8);
    }
    gr.to_8_bits[i]=bits;
  }
  DCRst(gr.dc);
  DCRst(gr.dc2);
}

U8 *MemSet(U8 *dst,I64 val,I64 cnt)
{//Returns the byte following the filled range, as REP_STOSB does.
  __memfill(dst,val,cnt);
  return dst+cnt;
}

U8 *MemCpy(U8 *dst,U8 *src,I64 cnt)
{//Native REP_MOVSB copies forward, including overlapping ranges.
  I64 i;
  if (src<dst<src+cnt)
    for (i=0;i<cnt;i++) dst[i]=src[i];
  else
    __memcopy(dst,src,cnt);
  return dst+cnt;
}

U32 BFieldExtU32(U8 *bit_field,I64 bit,I64 size)
{
  U64 *ptr=bit_field+(bit(U64)>>3);
  return (*ptr>>(bit&7))&((1<<size)-1);
}

I64 MemCmp(U8 *a,U8 *b,I64 cnt)
{//Compare unsigned bytes; native returns only -1, 0 or 1.
  while (cnt-->0) {
    if (*a<*b) return -1;
    if (*a>*b) return 1;
    a++;b++;
  }
  return 0;
}
I64 StrLen(U8 *s) { I64 n=0; while (s[n]) n++; return n; }
U0 StrCpy(U8 *d, U8 *s) { I64 i=0; while (s[i]) { d[i]=s[i]; i++; } d[i]=0; }
