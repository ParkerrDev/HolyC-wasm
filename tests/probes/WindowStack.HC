I64 win_z_hash=0xCBF29CE484222325,win_z_cnt=0;

U0 WinZChkVal(I64 val)
{
  win_z_hash=(win_z_hash^val)*0x100000001B3;
}

U0 WindowZChk()
{
  I64 i,j,n,step,old_highest=gr.highest_uncovered;
  CTask *tasks=CAlloc(sizeof(CTask)*5),*task,*old_mgr=sys_winmgr_task,
	*old_focus=sys_focus_task;
  U16 *old_buf=gr.win_z_buf,*buf=CAlloc(TEXT_ROWS*TEXT_COLS*sizeof(U16));
  U8 *old_uncovered=gr.win_uncovered_bitmap,*uncovered=CAlloc(65536/8);
  gr.win_z_buf=buf;
  gr.win_uncovered_bitmap=uncovered;
  gr.highest_uncovered=0;
  sys_winmgr_task=tasks;
  for (n=0;n<256;n++) {
    for (i=0,task=tasks;i<5;i++,task++) {
      MemSet(task,0,sizeof(CTask));
      task->addr=task;
      task->task_signature=TASK_SIGNATURE_VAL;
      task->task_num=i;
      task->gs=Fs->gs;
      task->next_ctrl=task->last_ctrl=&task->next_ctrl;
      task->next_child_task=task->last_child_task=
	    (&task->next_child_task)(U8 *)-offset(CTask.next_sibling_task);
      task->next_task=tasks+(i+1)%5;
      task->last_task=tasks+(i+4)%5;
      task->win_left=i*3;
      task->win_right=79-i*5;
      task->win_top=i*2;
      task->win_bottom=59-i*3;
      task->display_flags=1<<DISPLAYf_SHOW;
      if (i && Bt(&n,i-1))
	Bts(&task->display_flags,DISPLAYf_WIN_ON_TOP);
      if (i && Bt(&n,i+3))
	Bts(&task->win_inhibit,WIf_SELF_FOCUS);
      if (n&1) Bts(&task->display_flags,DISPLAYf_NO_BORDER);
      WinDerivedValsUpdate(task);
    }
    sys_focus_task=tasks;
    for (step=0;step<5;step++) {
      WinZChkVal(WinToTop(tasks+1+(n+step)%4));
      task=sys_winmgr_task;
      for (i=0;i<5;i++) {
	WinZChkVal(task->task_num);
	if (task->next_task->last_task!=task ||
	      task->last_task->next_task!=task)
	  throw('WinQueue');
	task=task->next_task;
      }
      if (task!=sys_winmgr_task)
	throw('WinQueue');
      WinZChkVal(sys_focus_task->task_num);
      WinZBufUpdate;
      for (j=0;j<TEXT_ROWS*TEXT_COLS;j++)
	WinZChkVal(buf[j]);
      WinZChkVal(gr.highest_uncovered);
      WinZChkVal(*uncovered);
      win_z_cnt++;
    }
  }
  sys_winmgr_task=old_mgr;
  sys_focus_task=old_focus;
  gr.win_z_buf=old_buf;
  gr.win_uncovered_bitmap=old_uncovered;
  gr.highest_uncovered=old_highest;
  Free(uncovered);Free(buf);Free(tasks);
  "WindowZ:%d:%016X\n",win_z_cnt,win_z_hash;
}

//Native manager isolation.
Suspend(sys_winmgr_task);
try WindowZChk;catch Suspend(sys_winmgr_task,FALSE);
Suspend(sys_winmgr_task,FALSE);
