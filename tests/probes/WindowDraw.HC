U0 WinHostDraw(CTask *task,CDC *layer)
{//Each V5.03 draw_it invocation owns a fresh alias of the window layer.
  CDC *dc;
  if (!TaskValidate(task) || !task->draw_it)
    return;
  dc=DCAlias(layer,task);
  try
    (*task->draw_it)(task,dc);
  catch
    DCDel(dc);
  DCDel(dc);
}

//Shared fixture.
I64 win_draw_cnt=0,win_draw_bad=0,win_draw_mode=0;
CDC *win_draw_layer=NULL;

U0 WinDrawChkCB(CTask *task,CDC *dc)
{
  I64 i;
  if (Fs==task || task!=Fs->parent_task || dc==win_draw_layer ||
	dc->alias!=win_draw_layer || dc->body!=win_draw_layer->body ||
	dc->r==win_draw_layer->r || dc->mem_task!=task ||
	dc->win_task!=task || dc->color!=BLACK || dc->thick!=1 ||
	dc->x || dc->y || dc->z || dc->collision_cnt)
    win_draw_bad++;
  for (i=0;i<16;i++)
    if (i%5) {
      if (dc->r[i]) win_draw_bad++;
    } else if (dc->r[i]!=GR_SCALE)
      win_draw_bad++;
  dc->color=RED+win_draw_cnt;
  GrRect(dc,win_draw_cnt*3,0,3,4);
  dc->color=YELLOW;
  dc->thick=17;
  dc->x=99;dc->y=-3;dc->z=71;
  dc->collision_cnt=999;
  MemSet(dc->r,0,16*sizeof(I64));
  win_draw_cnt++;
  if (win_draw_mode)
    throw('DrawStop');
}

U0 WinDrawChkTask(U8 *)
{
  I64 i,err=0;
  CTask *task=Fs->parent_task;
  for (i=0;i<4;i++)
    WinHostDraw(task,win_draw_layer);
  win_draw_mode=1;
  try
    WinHostDraw(task,win_draw_layer);
  catch {
    err=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (err!='DrawStop')
    win_draw_bad++;
  PostMsg(task,MSG_CMD,win_draw_cnt,win_draw_bad);
}

U0 WinDrawChk()
{
  I64 i,x,y,count,bad,hash=0xCBF29CE484222325;
  CTask *child;
  U0 (*old_draw)(CTask *,CDC *);
  old_draw=Fs->draw_it;
  win_draw_cnt=win_draw_bad=win_draw_mode=0;
  win_draw_layer=DCNew(16,8);
  MemSet(win_draw_layer->body,WHITE,win_draw_layer->width_internal*8);
  win_draw_layer->color=PURPLE;
  win_draw_layer->thick=3;
  win_draw_layer->x=5;
  Fs->draw_it=&WinDrawChkCB;
  child=Spawn(&WinDrawChkTask,,,,Fs);
  GetMsg(&count,&bad,1<<MSG_CMD);
  while (TaskValidate(child))
    Yield;
  Fs->draw_it=old_draw;
  if (count!=5 || bad || win_draw_layer->color!=PURPLE ||
	win_draw_layer->thick!=3 || win_draw_layer->x!=5)
    throw('WinDraw');
  for (i=0;i<16;i++)
    if (i%5) {
      if (win_draw_layer->r[i]) throw('WinDraw');
    } else if (win_draw_layer->r[i]!=GR_SCALE)
      throw('WinDraw');
  for (y=0;y<8;y++)
    for (x=0;x<16;x++) {
      i=WHITE;
      if (x<15 && y<4) i=RED+x/3;
      if (win_draw_layer->body[y*16+x]!=i)
	throw('WinPixel');
      hash=(hash^i)*0x100000001B3;
    }
  DCDel(win_draw_layer);
  win_draw_layer=NULL;
  "WinDraw:%d:%016X\n",count,hash;
}

//Native manager isolation.
Suspend(sys_winmgr_task);
try WinDrawChk;catch Suspend(sys_winmgr_task,FALSE);
Suspend(sys_winmgr_task,FALSE);
