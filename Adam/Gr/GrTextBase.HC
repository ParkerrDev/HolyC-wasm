//V5.03 Adam/Gr/GrTextBase.HC. Its first four are asm there; these are
//the same steps in HolyC, with his labels' checks in his order.
#help_index "TextBase Layer;Char/TextBase Layer"
#help_file "::/Doc/TextBase"

public Bool TextChar(CTask *task,Bool allow_border=FALSE,I64 x,I64 y,I64 d)
{//Plot char. 30fps in Fs->draw_it() callback.
  x+=task->scroll_x>>3;
  y+=task->scroll_y>>3;
  if (allow_border) {
    if (x<-1) return FALSE;
    x+=task->win_left;
    if (x>task->win_right+1 || !(0<=x<TEXT_COLS)) return FALSE;
    if (y<-1) return FALSE;
    y+=task->win_top;
    if (y>task->win_bottom+1 || !(0<=y<TEXT_ROWS)) return FALSE;
  } else {
    if (x<0) return FALSE;
    x+=task->win_left;
    if (x>task->win_right || !(0<=x<TEXT_COLS)) return FALSE;
    if (y<0) return FALSE;
    y+=task->win_top;
    if (y>task->win_bottom || !(0<=y<TEXT_ROWS)) return FALSE;
  }
  gr.text_base[y*TEXT_COLS+x]=d;
  return TRUE;
}

I64 TextClipX(CTask *task,I64 *_x,I64 *_len)
{//The X clip the asm three share. Returns how many chars were cut on the left.
  I64 x=*_x+task->scroll_x>>3,len=*_len,r,res=0;
  if (x<0) {
    len+=x;
    res-=x;
    x=0;
  }
  x+=task->win_left;
  r=len+x-1;
  if (r>task->win_right) {
    len-=r-task->win_right;
    r=task->win_right;
  }
  if (x<0) {
    len+=x;
    res-=x;
    x=0;
  }
  if (++r>TEXT_COLS)
    len-=r-TEXT_COLS;
  *_x=x;
  *_len=len;
  return res;
}

Bool TextClipY(CTask *task,I64 *_y)
{//The Y check the asm three share.
  I64 y=*_y+task->scroll_y>>3;
  if (y<0) return FALSE;
  y+=task->win_top;
  if (y>task->win_bottom || !(0<=y<TEXT_ROWS)) return FALSE;
  *_y=y;
  return TRUE;
}

public Bool TextLenStr(CTask *task,I64 x,I64 y,I64 len,I64 attr,U8 *s)
{//Plot str with len.  30fps in Fs->draw_it() callback.
  U32 *dst;
  s+=TextClipX(task,&x,&len);
  if (len<1 || !TextClipY(task,&y)) return FALSE;
  dst=gr.text_base+y*TEXT_COLS+x;
  attr&=~0xFF;
  while (len--)
    *dst++=attr|*s++;
  return TRUE;
}

public Bool TextLenAttrStr(CTask *task,I64 x,I64 y,I64 len,U32 *_attr)
{//Plot attr str with len.	30fps in Fs->draw_it() callback.
  U32 *dst;
  _attr+=TextClipX(task,&x,&len);
  if (len<1 || !TextClipY(task,&y)) return FALSE;
  dst=gr.text_base+y*TEXT_COLS+x;
  while (len--)
    *dst++=*_attr++;
  return TRUE;
}

public Bool TextLenAttr(CTask *task,I64 x,I64 y,I64 len,I64 attr)
{//Plot attrs with len.  30fps in Fs->draw_it() callback.
  U32 *dst;
  TextClipX(task,&x,&len);
  if (len<1 || !TextClipY(task,&y)) return FALSE;
  dst=gr.text_base+y*TEXT_COLS+x;
  while (len-- && !(*dst&0xFF))
    *dst++=attr;
  return TRUE;
}

public U0 TextPrint(CTask *task,I64 x,I64 y,I64 attr,U8 *fmt,...)
{//Plot chars. 30fps in Fs->draw_it() callback.
//You probably want $LK,"GrPrint",A="MN:GrPrint"$() or just $LK,"Print",A="MN:Print"$().
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  TextLenStr(task,x,y,StrLen(buf),attr<<8,buf);
  Free(buf);
}

public U0 TextBorder(CTask *task=NULL,
	I64 l,I64 r,I64 t,I64 b,I64 attr,Bool solid)
{//Plot border square. 30fps in Fs->draw_it() callback.
//Draws window borders or DolDoc text bttn borders.
  //Set task=sys_winmgr_task for no clipping.
  I64 i;
  if (!task) task=Fs;
  attr<<=8;
  TextChar(task,,l-1,t-1,text.border_chars[6+solid]+attr);
  TextChar(task,,r+1,t-1,text.border_chars[8+solid]+attr);
  TextChar(task,,l-1,b+1,text.border_chars[10+solid]+attr);
  TextChar(task,,r+1,b+1,text.border_chars[12+solid]+attr);
  for (i=l;i<=r;i++) {
    TextChar(task,,i,t-1,text.border_chars[2+solid]+attr);
    TextChar(task,,i,b+1,text.border_chars[2+solid]+attr);
  }
  for (i=t;i<=b;i++) {
    TextChar(task,,l-1,i,text.border_chars[4+solid]+attr);
    TextChar(task,,r+1,i,text.border_chars[4+solid]+attr);
  }
}

public U0 TextRect(I64 l,I64 r,I64 t,I64 b,I64 d)
{//Fill text rect. 30fps in Fs->draw_it() callback.
  I64 y,w;
  if (l>r || t>b) return;
  if (t<0) t=0;
  if (b>=TEXT_ROWS) b=TEXT_ROWS-1;
  if (l<0) l=0;
  if (r>=TEXT_COLS) r=TEXT_COLS-1;
  if (w=r-l+1)
    for (y=t;y<=b;y++)
      MemSetU32(gr.text_base(U8 *)+(y*TEXT_COLS+l)*sizeof(U32),d,w);
}
