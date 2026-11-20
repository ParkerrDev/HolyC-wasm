public CTaskSettings *SettingsPush(CTask *task=NULL,I64 flags=0)
{//$LK,"SettingsPush",A="FF:::/Adam/TaskSettings.HC,SettingsPush"$.
  CTaskSettings *tmpse;
  CDoc *doc;
  if (!task) task=Fs;
  if (!TaskValidate(task)) return NULL;
  tmpse=CAlloc(sizeof(CTaskSettings),task);
  tmpse->cur_dir=DirCur(task,task);
  tmpse->draw_it=task->draw_it;
  GrPaletteGet(tmpse->palette);
  tmpse->task_end_cb=task->task_end_cb;
  if (!(flags&TSF_SAME_SONG)) {
    if (tmpse->song_task=task->song_task) {
      Suspend(task->song_task);
      Snd;
    }
    task->song_task=NULL;
  }
  if (tmpse->animate_task=task->animate_task)
    Suspend(task->animate_task);
  task->animate_task=NULL;
  if (doc=DocPut(task)) {
    tmpse->hide_cursor=!Bt(&doc->flags,DOCf_HIDE_CURSOR);
    tmpse->highlight_cursor=!Bt(&doc->flags,DOCf_DONT_HIGHLIGHT_CURSOR);
    tmpse->scroll=!Bt(&doc->flags,DOCf_NO_SCROLL_BARS);
  }
  tmpse->left=task->win_left;
  tmpse->right=task->win_right;
  tmpse->top=task->win_top;
  tmpse->bottom=task->win_bottom;
  tmpse->scroll_x=task->scroll_x;
  tmpse->scroll_y=task->scroll_y;
  tmpse->scroll_z=task->scroll_z;
  tmpse->win_inhibit=task->win_inhibit;
  tmpse->text_attr=task->text_attr;
  StrCpy(tmpse->task_title,task->task_title);
  tmpse->title_src=task->title_src;
  tmpse->border_attr=task->border_attr;
  tmpse->border_src=task->border_src;
  tmpse->border=!Bt(&task->display_flags,DISPLAYf_NO_BORDER);
  if (TaskValidate(ac.task))
    tmpse->autocomplete=TRUE;
  else
    tmpse->autocomplete=FALSE;
  tmpse->next=task->next_settings;
  task->next_settings=tmpse;
  if (sys_winmgr_task==adam_task) //No WinMgr yet: V5.03 StartOS.HC's line.
    sys_winmgr_task=Spawn(&WinMgrTask,NULL,"Window Mgr",,task);
  return tmpse;
}

U0 SettingsPop2(CTask *task,CTaskSettings *tmpse)
{
  CDoc *doc;
  if (doc=DocPut(task)) {
    LBEqu(&doc->flags,DOCf_HIDE_CURSOR,!tmpse->hide_cursor);
    LBEqu(&doc->flags,DOCf_DONT_HIGHLIGHT_CURSOR,!tmpse->highlight_cursor);
    LBEqu(&doc->flags,DOCf_NO_SCROLL_BARS,!tmpse->scroll);
  }
  WinBorder(tmpse->border,task);
  WinHorz(tmpse->left,tmpse->right,task);
  WinVert(tmpse->top,tmpse->bottom,task);
  task->scroll_x=tmpse->scroll_x;
  task->scroll_y=tmpse->scroll_y;
  task->scroll_z=tmpse->scroll_z;
  task->win_inhibit=tmpse->win_inhibit;
  task->text_attr=tmpse->text_attr;
  task->border_attr=tmpse->border_attr;
  task->border_src=tmpse->border_src;
  task->title_src=tmpse->title_src;
  StrCpy(task->task_title,tmpse->task_title);
  AutoComplete(tmpse->autocomplete);
  GrPaletteSet(tmpse->palette);
  Snd;
}

public U0 SettingsPop(CTask *task=NULL,I64 flags=0)
{//$LK,"SettingsPop",A="FF:::/Adam/TaskSettings.HC,SettingsPop"$, which kills the animate and song tasks.
  CTaskSettings *tmpse;
  if (!task) task=Fs;
  if (!TaskValidate(task))
    return;
  if (tmpse=task->next_settings) {
    task->next_settings=tmpse->next;
    Cd(tmpse->cur_dir);
    Free(tmpse->cur_dir);
    task->draw_it=tmpse->draw_it;
    task->task_end_cb=tmpse->task_end_cb;
    if (task->animate_task)
      Kill(task->animate_task);
    if (task->animate_task=tmpse->animate_task)
      Suspend(task->animate_task,FALSE);
    if (!(flags&TSF_SAME_SONG)) {
      if (task->song_task)
	Kill(task->song_task);
      if (task->song_task=tmpse->song_task)
	Suspend(task->song_task,FALSE);
    }
    SettingsPop2(task,tmpse);
    Free(tmpse);
  }
}

//V5.03 Adam/WinMgr.HC WinQueIPMsgs: the focus task's ms msgs.
I64 WinQueIPMsgs(Bool que)
{
  static CD3I64 single_ms={0,0,0};
  F64 time=tS;
  I64 msg_code=0,arg1,arg2,single_arg1,single_arg2;
  CTask *task_focus=sys_focus_task;

  if (task_focus && !winmgr.grab_scroll) {
    arg1=ms.pos.x-task_focus->pix_left-task_focus->scroll_x;
    arg2=ms.pos.y-task_focus->pix_top-task_focus->scroll_y;
    single_arg1=single_ms.x-task_focus->pix_left-task_focus->scroll_x;
    single_arg2=single_ms.y-task_focus->pix_top-task_focus->scroll_y;
    if (old_ms.presnap.x!=ms.presnap.x || old_ms.presnap.y!=ms.presnap.y) {
      if (que)
	TaskMsg(task_focus,0,
	      MSG_MS_MOVE,arg1,arg2,0);
      msg_code=MSG_MS_MOVE;
    }
//TODO que msg for ms.pos.z?
    if (ms.left_dbl_time) {
      if (time>ms.left_dbl_time) {
	if (ms.left_dbl) {
	  if (!ms.left_down_sent) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_L_D_DOWN,arg1,arg2,0);
	    ms.left_down_sent=TRUE;
	    msg_code=MSG_MS_L_D_DOWN;
	  }
	  if (!ms.lb) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_L_D_UP,arg1,arg2,0);
	    ms.left_dbl_time=0;
	    msg_code=MSG_MS_L_D_UP;
	  }
	} else {
	  if (!ms.left_down_sent) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_L_DOWN,single_arg1,single_arg2,0);
	    ms.left_down_sent=TRUE;
	    msg_code=MSG_MS_L_DOWN;
	  }
	  if (!ms.lb) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_L_UP,arg1,arg2,0);
	    ms.left_dbl_time=0;
	    msg_code=MSG_MS_L_UP;
	  }
	}
      } else {
	if (ms.lb && !ms_last.lb) {
	  ms.left_dbl_time=time;
	  ms.left_dbl=TRUE;
	}
      }
    } else {
      if (TaskValidate(task_focus) &&
	    Bt(&task_focus->win_inhibit,WIf_FOCUS_TASK_MS_L_D)) {
	if (ms.lb  && !ms_last.lb) {
	  if (que)
	    TaskMsg(task_focus,0,
		  MSG_MS_L_DOWN,arg1,arg2,0);
	  msg_code=MSG_MS_L_DOWN;
	} else if (!ms.lb && ms_last.lb) {
	  if (que)
	    TaskMsg(task_focus,0,
		  MSG_MS_L_UP,arg1,arg2,0);
	  msg_code=MSG_MS_L_UP;
	}
      } else {
	if (ms.lb  && !ms_last.lb) {
	  ms.left_dbl=FALSE;
	  ms.left_down_sent=FALSE;
	  ms.left_dbl_time=time+ms.dbl_time;
	  single_ms.x=ms.pos.x;
	  single_ms.y=ms.pos.y;
	}
      }
    }

    if (ms.right_dbl_time) {
      if (time>ms.right_dbl_time) {
	if (ms.right_dbl) {
	  if (!ms.right_down_sent) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_R_D_DOWN,arg1,arg2,0);
	    ms.right_down_sent=TRUE;
	    msg_code=MSG_MS_R_D_DOWN;
	  }
	  if (!ms.rb) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_R_D_UP,arg1,arg2,0);
	    ms.right_dbl_time=0;
	    msg_code=MSG_MS_R_D_UP;
	  }
	} else {
	  if (!ms.right_down_sent) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_R_DOWN,single_arg1,single_arg2,0);
	    ms.right_down_sent=TRUE;
	    msg_code=MSG_MS_R_DOWN;
	  }
	  if (!ms.rb) {
	    if (que)
	      TaskMsg(task_focus,0,
		    MSG_MS_R_UP,arg1,arg2,0);
	    ms.right_dbl_time=0;
	    msg_code=MSG_MS_R_UP;
	  }
	}
      } else {
	if (ms.rb && !ms_last.rb) {
	  ms.right_dbl_time=time;
	  ms.right_dbl=TRUE;
	}
      }
    } else {
      if (TaskValidate(task_focus) &&
	    Bt(&task_focus->win_inhibit,WIf_FOCUS_TASK_MS_R_D)) {
	if (ms.rb  && !ms_last.rb) {
	  if (que)
	    TaskMsg(task_focus,0,
		  MSG_MS_R_DOWN,arg1,arg2,0);
	  msg_code=MSG_MS_R_DOWN;
	} else if (!ms.rb && ms_last.rb) {
	  if (que)
	    TaskMsg(task_focus,0,
		  MSG_MS_R_UP,arg1,arg2,0);
	  msg_code=MSG_MS_R_UP;
	}
      } else {
	if (ms.rb  && !ms_last.rb) {
	  ms.right_dbl=FALSE;
	  ms.right_down_sent=FALSE;
	  ms.right_dbl_time=time+ms.dbl_time;
	  single_ms.x=ms.pos.x;
	  single_ms.y=ms.pos.y;
	}
      }
    }

    MemCpy(&ms_last,&ms,sizeof(CMsStateGlbls));
    MemCpy(&old_ms,&ms,sizeof(CMsStateGlbls));
  }
  return msg_code;
}

U0 WinMgrSleep()
{//One frame of $LK,"WinMgrTask",A="MN:WinMgrTask"$, timed as V5.03's WinMgrSleep.
//The host queues key msgs as they come (KbdHostByte); here are the ms msgs,
//held back while the ms is over one of the focus task's ctrls.
  I64 timeout_val;
  F64 t,t_delta;
  CCtrl *c;
  Bool que;
  if ((t_delta=(t=tS)-winmgr.last_refresh_tS)>0.01)
    winmgr.fps=Max(1.0/t_delta,1);
  else
    winmgr.fps=99;
  winmgr.last_refresh_tS=t;
  if (TaskValidate(sys_focus_task)) {
    que=TRUE;
    if (!Bt(&sys_focus_task->win_inhibit,WIf_FOCUS_TASK_CTRLS)) {
      c=sys_focus_task->next_ctrl;
      while (c!=&sys_focus_task->next_ctrl) {
	if (CtrlInside(c,ms.pos.x,ms.pos.y)) {
	  que=FALSE;
	  break;
	}
	c=c->next;
      }
    }
    WinQueIPMsgs(que);
  }
  WinMsUpdate;
  if (!LBtr(&sys_semas[SEMA_JUST_PUMP_MSGS],0)) {
    t=tS+WINMGR_PERIOD/8;
    while (winmgr.ideal_refresh_tS<t)
      winmgr.ideal_refresh_tS+=WINMGR_PERIOD;
    timeout_val=cnts.jiffies+(winmgr.ideal_refresh_tS-tS)*JIFFY_FREQ;
    LBts(&sys_semas[SEMA_REFRESH_IN_PROGRESS],0);
    GrUpdateScrn;
    LBtr(&sys_semas[SEMA_REFRESH_IN_PROGRESS],0);
    winmgr.updates++;
    SleepUntil(timeout_val);
  }
}

U0 WinMgrTask(I64)
{//Calls the window's draw_it WINMGR_FPS times a second.
//V5.03's WinMgrTask with its ctrl part. It is sys_winmgr_task, the bottom of
//the win stack, under the other tasks' wins.
  CTask *task;
  I64 my_ms_z=0,left,top;
  CCtrl *c;
  WinHorz(0,TEXT_COLS-1);
  WinVert(0,TEXT_ROWS-1);
  LBts(&Fs->display_flags,DISPLAYf_NO_BORDER);
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  gr.dc->win_task=Fs;
  Fs->win_inhibit&=~WIF_SELF_CTRLS;
  WinZBufUpdate;
  while (TRUE) {
wmt_start:
    WinMgrSleep;

    task=sys_winmgr_task->last_task;
    while (TRUE) {
      if (!TaskValidate(task))
	goto wmt_start;
      TaskDerivedValsUpdate(task,FALSE);
      task=task->last_task;
      if (task==sys_winmgr_task)
	break;
    }
    TaskDerivedValsUpdate(sys_winmgr_task,FALSE);

    task=sys_winmgr_task->last_task;
    while (TRUE) {
      if (!TaskValidate(task))
	goto wmt_start;
      if (WinInside(ms.pos.x,ms.pos.y,task,FONT_WIDTH))
	break;
      if (task==sys_winmgr_task)
	goto wmt_start;
      task=task->last_task;
    }

    if (!Bt(&task->win_inhibit,WIf_SELF_CTRLS) &&
	  (!TaskValidate(sys_focus_task)||
	  !Bt(&sys_focus_task->win_inhibit,WIf_FOCUS_TASK_CTRLS))) {
      if (ms.lb && !old_ms.lb) {
	c=task->next_ctrl;
	while (c!=&task->next_ctrl) {
	  if (CtrlInside(c,ms.pos.x,ms.pos.y)) {
	    left=task->pix_left;
	    top =task->pix_top;
	    if (c->flags&CTRLF_BORDER) {
	      left-=FONT_WIDTH;
	      top -=FONT_HEIGHT;
	    }
	    if (c->flags&CTRLF_CAPTURE_LEFT_MS) {
	      while (ms.lb && TaskValidate(task)) {
		if (c->left_click)
		  (*c->left_click)(c,ms.pos.x-left,ms.pos.y-top,TRUE);
		WinMgrSleep;
	      }
	      if (c->left_click)
		(*c->left_click)(c,ms.pos.x-left,ms.pos.y-top,FALSE);
	      old_ms.lb=FALSE;
	      goto wmt_start;
	    } else {
	      if (c->left_click)
		(*c->left_click)(c,ms.pos.x-left,ms.pos.y-top,TRUE);
	      old_ms.lb=TRUE;
	      goto wmt_start;
	    }
	  }
	  c=c->next;
	}
      }
      if (old_ms.lb && !ms.lb) {
	c=task->next_ctrl;
	while (c!=&task->next_ctrl) {
	  if (CtrlInside(c,ms.pos.x,ms.pos.y)) {
	    left=task->pix_left;
	    top =task->pix_top;
	    if (c->flags&CTRLF_BORDER) {
	      left-=FONT_WIDTH;
	      top -=FONT_HEIGHT;
	    }
	    if (c->left_click)
	      (*c->left_click)(c,ms.pos.x-left,ms.pos.y-top,FALSE);
	    old_ms.lb=FALSE;
	    goto wmt_start;
	  }
	  c=c->next;
	}
      }
      if (ms.rb && !old_ms.rb) {
	c=task->next_ctrl;
	while (c!=&task->next_ctrl) {
	  if (CtrlInside(c,ms.pos.x,ms.pos.y)) {
	    left=task->pix_left;
	    top =task->pix_top;
	    if (c->flags&CTRLF_BORDER) {
	      left-=FONT_WIDTH;
	      top -=FONT_HEIGHT;
	    }
	    if (c->flags&CTRLF_CAPTURE_RIGHT_MS) {
	      while (ms.rb && TaskValidate(task)) {
		if (c->right_click)
		  (*c->right_click)(c,ms.pos.x-left,ms.pos.y-top,TRUE);
		WinMgrSleep;
	      }
	      if (c->right_click)
		(*c->right_click)(c,ms.pos.x-left,ms.pos.y-top,FALSE);
	      old_ms.rb=FALSE;
	      goto wmt_start;
	    } else {
	      if (c->right_click)
		(*c->right_click)(c,ms.pos.x-left,ms.pos.y-top,TRUE);
	      old_ms.rb=TRUE;
	      goto wmt_start;
	    }
	  }
	  c=c->next;
	}
      }
      if (old_ms.rb && !ms.rb) {
	c=task->next_ctrl;
	while (c!=&task->next_ctrl) {
	  if (CtrlInside(c,ms.pos.x,ms.pos.y)) {
	    left=task->pix_left;
	    top =task->pix_top;
	    if (c->flags&CTRLF_BORDER) {
	      left-=FONT_WIDTH;
	      top -=FONT_HEIGHT;
	    }
	    if (c->right_click)
	      (*c->right_click)(c,ms.pos.x-left,ms.pos.y-top,FALSE);
	    old_ms.rb=FALSE;
	    goto wmt_start;
	  }
	  c=c->next;
	}
      }
      if (ms.has_wheel && my_ms_z!=ms.pos.z) {
	if (task==sys_focus_task) {
	  c=task->next_ctrl;
	  while (c!=&task->next_ctrl) {
	    if (c->wheel_chg) {
	      (*c->wheel_chg)(c,ms.pos.z-my_ms_z);
	      my_ms_z=ms.pos.z;
	      goto wmt_start;
	    }
	    c=c->next;
	  }
	  my_ms_z=ms.pos.z;
	} else if (!sys_focus_task)
	  my_ms_z=ms.pos.z;
      }
    }
  }
}

public U0 Refresh(I64 cnt=1,Bool force=FALSE)
{//Wait for 30fps WinMgr to start & finish scrn refresh.
  //0,FALSE Cnt Sync to WinMgr.
  //0,TRUE  Pump Msgs.
  //1 Cnt Wait and Pump Msgs.
  //2 Cnt Make Sure to do a Full Refresh
  //and Set Cur Pos.
//With no $LK,"WinMgrTask",A="MN:WinMgrTask"$ (no SettingsPush), this task flushes.
  Bool	old_full_refresh,
	old_idle=LBts(&Fs->task_flags,TASKf_IDLE);
  CDoc *old_doc=DocPut;
  I64 update_cnt;
  if (!cnt&&force)
    LBts(&sys_semas[SEMA_JUST_PUMP_MSGS],0);
  while (Bt(&sys_semas[SEMA_REFRESH_IN_PROGRESS],0)) {
    if (force && sys_winmgr_task)
      sys_winmgr_task->wake_jiffy=cnts.jiffies;
    Yield;
  }
  if (cnt>1 && old_doc)
    old_full_refresh=LBts(&old_doc->flags,DOCf_DO_FULL_REFRESH);
  update_cnt=winmgr.updates+cnt;
  while (winmgr.updates<update_cnt) {
    if (force && sys_winmgr_task)
      sys_winmgr_task->wake_jiffy=cnts.jiffies;
    if (sys_winmgr_task!=adam_task)
      Sleep(1);
    else {//No WinMgr: his $LK,"GrUpdateScrn",A="MN:GrUpdateScrn"$ with no win tasks, so no ODEs link.
      GrUpdateTextBG;
      GrUpdateTextFG;
      DCBlotColor8(gr.dc2,gr.dc);
      DCBlotColor4(gr.dc1->body,gr.dc2->body,gr.dc_cache->body,
	    gr.dc2->height*gr.dc2->width_internal>>3);
      GrUpdateVGAGraphics;
      winmgr.updates++;
      Sleep(1000*WINMGR_PERIOD);
    }
  }
  if (old_doc)
    LBEqu(&old_doc->flags,DOCf_DO_FULL_REFRESH,old_full_refresh);
  LBEqu(&Fs->task_flags,TASKf_IDLE,old_idle);
}
