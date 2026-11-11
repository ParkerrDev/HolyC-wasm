I64 win_chk_hash=0xCBF29CE484222325,win_chk_cnt=0,
	win_chk_vals[15]={-160,-80,-2,-1,0,1,2,29,58,59,60,78,79,80,160};

U0 WinChkVal(I64 val)
{
  win_chk_hash=(win_chk_hash^val)*0x100000001B3;
}

U0 WinChkState(CTask *task)
{
  I64 i,*ptr=&task->win_width;
  WinChkVal(task->win_left);
  WinChkVal(task->win_right);
  WinChkVal(task->win_top);
  WinChkVal(task->win_bottom);
  WinChkVal(task->display_flags);
  for (i=0;i<8;i++)
    WinChkVal(ptr[i]);
  win_chk_cnt++;
}

U0 WindowChk()
{
  I64 i,j,k,n,
	left=Fs->win_left,right=Fs->win_right,
	top=Fs->win_top,bottom=Fs->win_bottom,flags=Fs->display_flags;
  CTask *task=CAlloc(sizeof(CTask)),bad;
  CD3I64 saved;
  task->addr=task;
  task->task_signature=TASK_SIGNATURE_VAL;
  task->next_ctrl=task->last_ctrl=&task->next_ctrl;
  MemSet(&bad,0,sizeof(CTask));
  WinChkVal(WinHorz(0,79,&bad));
  WinChkVal(WinVert(1,59,&bad));
  WinChkVal(WinBorder(ON,&bad));
  WinChkVal(WinInside(0,0,&bad));
  for (n=0;n<2;n++)
    for (i=0;i<15;i++)
      for (j=0;j<15;j++) {
	task->win_left=1;task->win_right=78;
	task->win_top=2;task->win_bottom=58;
	task->display_flags=1<<DISPLAYf_SHOW;
	if (n) Bts(&task->display_flags,DISPLAYf_NO_BORDER);
	WinDerivedValsUpdate(task);
	WinChkVal(WinHorz(win_chk_vals[i],win_chk_vals[j],task));
	WinChkVal(WinVert(win_chk_vals[j],win_chk_vals[i],task));
	WinChkState(task);
	WinChkVal(WinHorz(win_chk_vals[i],win_chk_vals[j],task));
	WinChkVal(WinVert(win_chk_vals[j],win_chk_vals[i],task));
	for (k=-9;k<=9;k++) {
	  WinChkVal(WinInside(task->pix_left+k,task->pix_top,task,8));
	  WinChkVal(WinInside(task->pix_right+k,task->pix_bottom,task,8));
	  WinChkVal(WinInside(task->pix_left,task->pix_top+k,task,8));
	  WinChkVal(WinInside(task->pix_right,task->pix_bottom+k,task,8));
	}
	WinChkVal(WinBorder(OFF,task));
	WinChkState(task);
	WinChkVal(WinBorder(OFF,task));
	WinChkState(task);
	WinChkVal(WinBorder(ON,task));
	WinChkState(task);
	WinChkVal(WinBorder(ON,task));
	WinChkState(task);
	Btr(&task->display_flags,DISPLAYf_SHOW);
	WinChkVal(WinInside(task->pix_left,task->pix_top,task));
      }
  task->scroll_x=-71;task->scroll_y=123;task->scroll_z=-5;
  WinScrollNull(task,&saved);
  WinChkVal(task->scroll_x|task->scroll_y|task->scroll_z);
  WinScrollRestore(task,&saved);
  WinChkVal(task->scroll_x);WinChkVal(task->scroll_y);
  WinChkVal(task->scroll_z);
  Fs->display_flags=1<<DISPLAYf_SHOW;
  for (i=0;i<2;i++) {
    WinBorder(i);
    WinMax;
    WinChkState(Fs);
  }
  Fs->display_flags=flags;
  WinHorz(left,right);
  WinVert(top,bottom);
  Free(task);
  "Window:%d:%016X\n",win_chk_cnt,win_chk_hash;
}

WindowChk;
