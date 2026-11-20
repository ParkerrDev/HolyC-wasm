public CWinMgrGlbls winmgr={0,0,0,WINMGR_FPS,tS,tS,NULL,FALSE,FALSE,FALSE};
winmgr.t=CAlloc(sizeof(CWinMgrTimingGlbls));
winmgr.t->last_calc_idle_time=tS;

U0 ProgressBarsRegTf(U8 *path=NULL)
{
  F64 t,p1,p2,p3,p4;
  if (path) {
    t=tS;
    if (progress1_t0) p1=t-progress1_t0; else p1=0;
    if (progress2_t0) p2=t-progress2_t0; else p2=0;
    if (progress3_t0) p3=t-progress3_t0; else p3=0;
    if (progress4_t0) p4=t-progress4_t0; else p4=0;
    RegWrite(path,"progress1_tf=%0.3f;progress2_tf=%0.3f;\n"
	  "progress3_tf=%0.3f;progress4_tf=%0.3f;\n",p1,p2,p3,p4);
  }
}

#define PROGRESS_BAR_HEIGHT	20
#define PROGRESS_BAR_WIDTH	(3*GR_WIDTH/4)
U0 DrawProgressBars(CDC *dc)
{
  I64 i,j,k,n,m;
  U8 *st,*st2;
  for (i=0;i<PROGRESS_BARS_NUM;i++) {
    if (m=sys_progresses[i].max) {
      dc->color=BLACK;
      GrRect(dc,
	    (GR_WIDTH-PROGRESS_BAR_WIDTH)/2,
	    (GR_HEIGHT-(PROGRESS_BARS_NUM*2-1-i*4)*PROGRESS_BAR_HEIGHT)/2,
	    PROGRESS_BAR_WIDTH,PROGRESS_BAR_HEIGHT);

      dc->color=LTGREEN;
      n=sys_progresses[i].val;
      if (n>m)
	n=m;
      GrRect(dc,
	    (GR_WIDTH-PROGRESS_BAR_WIDTH)/2+2,
	    (GR_HEIGHT-(PROGRESS_BARS_NUM*2-1-i*4)*PROGRESS_BAR_HEIGHT)/2+2,
	    n*(PROGRESS_BAR_WIDTH-4)/m,
	    PROGRESS_BAR_HEIGHT-4);

      if (m>1) {
	dc->color=BLACK;
	k=m-1;
	if (k>19) k=19;
	for (j=0;j<=k;j++)
	  GrLine(dc,
		(GR_WIDTH-PROGRESS_BAR_WIDTH)/2+1+j*
		(PROGRESS_BAR_WIDTH-4)/ToF64(k+1),
		(GR_HEIGHT-(PROGRESS_BARS_NUM*2-1-i*4)*
		PROGRESS_BAR_HEIGHT)/2+4,
		(GR_WIDTH-PROGRESS_BAR_WIDTH)/2+1+j*
		(PROGRESS_BAR_WIDTH-4)/ToF64(k+1),
		(GR_HEIGHT-(PROGRESS_BARS_NUM*2-3-i*4)*
		PROGRESS_BAR_HEIGHT)/2-4);
      }

      dc->color=GREEN;
      if (*sys_progresses[i].desc)
	st=StrNew(sys_progresses[i].desc);
      else
	st=MStrPrint("%d/%d",n,m);
      if (sys_progresses[i].t0) {
	st2=MStrPrint("%s %fs",st,tS-sys_progresses[i].t0);
	Free(st);
      } else
	st2=st;
      if (sys_progresses[i].tf) {
	st=MStrPrint("%s/%fs",st2,sys_progresses[i].tf);
	Free(st2);
      } else
	st=st2;
      GrPrint(dc,(GR_WIDTH-FONT_WIDTH*StrLen(st))/2,(GR_HEIGHT-FONT_HEIGHT-
	    (PROGRESS_BARS_NUM*2-2-i*4)*PROGRESS_BAR_HEIGHT)/2,"%s",st);
      Free(st);
    }
  }
}

U0 DrawWinGrid(CDC *dc)
{
  F64 d;
  dc->color=BLACK;
  dc->thick=1;
  for (d=ms_grid.x_offset;d<GR_WIDTH; d+=ms_grid.x)
    GrLine(dc,d,0,d,GR_HEIGHT-1);
  for (d=ms_grid.y_offset;d<GR_HEIGHT;d+=ms_grid.y)
    GrLine(dc,0,d,GR_WIDTH-1,d);
}

//Browser tasks share one cooperative CPU and one native window stack.

Bool win_host_z_dirty=TRUE;
U0 (*fp_update_ctrls)(CTask *task)=NULL;

U0 TaskQueIns(CTask *task,CTask *pred=NULL)
{//Insert a task in the scheduler running task queue.
  CTask *last;
  if (!pred) pred=Fs;
  last=pred->last_task;
  last->next_task=pred->last_task=task;
  task->last_task=last;
  task->next_task=pred;
}

U0 TaskQueRem(CTask *task)
{//Remove a task from the scheduler running task queue.
//Use $LK,"Suspend",A="MN:Suspend"$().
  CTask *next,*last;
  next=task->next_task;
  last=task->last_task;
  last->next_task=next;
  next->last_task=last;
}

I64 WinOnTopWindows()
{
  CTask *task,*task1,*first_moved_fwd=NULL;
  I64 res=0;
  task=sys_winmgr_task->next_task;
  while (task!=sys_winmgr_task && task!=first_moved_fwd) {
    task1=task->next_task;
    if (!TaskValidate(task)) {
      return res;
    }
    if (Bt(&task->display_flags,DISPLAYf_WIN_ON_TOP) &&
	  task!=sys_winmgr_task->last_task) {
      TaskQueRem(task);
      TaskQueIns(task,sys_winmgr_task);
      res++;
      if (!first_moved_fwd)
	first_moved_fwd=task;
    }
    task=task1;
  }
  return res;
}

public I64 WinToTop(CTask *task=NULL,Bool update_z_buf=TRUE)
{//Put task's win on top of window stack.
  CTask *task1;
  I64 res=0;
  if (!task) task=Fs;
  if (!TaskValidate(task))
    return 0;
  TaskDerivedValsUpdate(task,FALSE);
  if (!sys_winmgr_task || task==sys_winmgr_task)
    return 0;
  if (!TaskValidate(task)) {
    return 0;
  }
  if (task!=sys_winmgr_task->last_task) {
    TaskQueRem(task);
    TaskQueIns(task,sys_winmgr_task);
    res++;
  }
  if (!Bt(&task->win_inhibit,WIf_SELF_FOCUS))
    sys_focus_task=task;
  if (res && !Bt(&task->display_flags,DISPLAYf_CHILDREN_NOT_ON_TOP)) {
    task1=task->next_child_task;
    while (task1!=&task->next_child_task) {
      if (!TaskValidate(task1))
	break;
      res+=WinToTop(task1,FALSE);
      task1=task1->next_sibling_task;
    }
    if (task->popup_task &&
	  task->popup_task->parent_task==task)
      res+=WinToTop(task->popup_task,FALSE);
  }
  res+=WinOnTopWindows;
  if (res && update_z_buf)
    WinZBufUpdate;
  return res;
}

U0 WinZBufFill(CTask *task)
{//Fill the text-cell occlusion map.
  I64 x,y,t,b,l,r;
  if (!Bt(&task->display_flags,DISPLAYf_NO_BORDER)) {
    if (task->win_top-1>0)
      t=task->win_top-1;
    else
      t=0;
    if (task->win_bottom+1<TEXT_ROWS)
      b=task->win_bottom+1;
    else
      b=TEXT_ROWS-1;
    if (task->win_left-1>0)
      l=task->win_left-1;
    else
      l=0;
    if (task->win_right+1<TEXT_COLS)
      r=task->win_right+1;
    else
      r=TEXT_COLS-1;
  } else {
    if (task->win_top>0)
      t=task->win_top;
    else
      t=0;
    if (task->win_bottom<TEXT_ROWS)
      b=task->win_bottom;
    else
      b=TEXT_ROWS-1;
    if (task->win_left>0)
      l=task->win_left;
    else
      l=0;
    if (task->win_right<TEXT_COLS)
      r=task->win_right;
    else
      r=TEXT_COLS-1;
  }
  t=ClampI64(t,0,TEXT_ROWS-1);
  b=ClampI64(b,t,TEXT_ROWS-1);
  l=ClampI64(l,0,TEXT_COLS-1);
  r=ClampI64(r,l,TEXT_COLS-1);
  for (y=t;y<=b;y++)
    for (x=l;x<=r;x++)
      gr.win_z_buf[y*TEXT_COLS+x]=task->win_z_num;
}

public U0 WinZBufUpdate()
{//Might have to call if doing graphics outside winmgr callback routines.
//Call it if, for example, when a pop-up window closes and you need to refresh
  //before graphics.
  I64 i,z=1;
  U16 *ptr;
  CTask *task,*task1;
  if (gr.win_z_buf) {
    win_host_z_dirty=FALSE;
    task1=task=sys_winmgr_task;
    do {
      if (!TaskValidate(task)) break;
      if (Bt(&task->display_flags,DISPLAYf_SHOW)) {
	task->win_z_num=z++;
	WinZBufFill(task);
      }
      task=task->next_task;
    } while (task!=task1 && z<0x10000);
    MemSet(gr.win_uncovered_bitmap,0,(gr.highest_uncovered+7)>>3+1);
    gr.highest_uncovered=z-1;
    for (ptr=gr.win_z_buf,i=TEXT_ROWS*TEXT_COLS;i;i--)
      Bts(gr.win_uncovered_bitmap,*ptr++);
  }
}

//Window geometry from TempleOS V5.03 Kernel/Display and Adam/Win.

U0 WinDerivedValsUpdate(CTask *task)
{//Those things calculated from other variables.
  if (!task) task=Fs;
  //Assert: This is called with TASKf_TASK_LOCK set
  task->win_width =task->win_right-task->win_left+1;
  task->win_height=task->win_bottom-task->win_top+1;
  task->pix_left	=FONT_WIDTH*task->win_left;
  task->pix_right	=FONT_WIDTH*(task->win_right+1)-1;
  task->pix_width	=task->pix_right-task->pix_left+1;
  task->pix_top		=FONT_HEIGHT*task->win_top;
  task->pix_bottom	=FONT_HEIGHT*(task->win_bottom+1)-1;
  task->pix_height	=task->pix_bottom-task->pix_top+1;
}

U0 TaskDerivedValsUpdate(CTask *task=NULL,Bool update_z_buf=TRUE)
{//The browser scheduler switches tasks only at explicit yield points.
  if (!task) task=Fs;
  Bts(&task->task_flags,TASKf_TASK_LOCK);
  WinDerivedValsUpdate(task);
  if (fp_update_ctrls)
    (*fp_update_ctrls)(task);
  if (update_z_buf && Bt(&task->display_flags,DISPLAYf_SHOW))
    win_host_z_dirty=TRUE;
  Btr(&task->task_flags,TASKf_TASK_LOCK);
}

public Bool WinHorz(I64 left,I64 right,CTask *task=NULL)
{//Set task's win left and right columns.
  I64 d=right-left;
  if (!task) task=Fs;
  if (!TaskValidate(task)) return FALSE;
  if (d<0) d=0;
  if (left>=TEXT_COLS) {
    left=TEXT_COLS-1;
    right=left+d;
  }
  if (right<0) {
    right=0;
    left=right-d;
  }
  if (left>right) {
    if (left>0)
      right=left;
    else
      left=right;
  }
  if (task->win_left!=left || task->win_right!=right) {
    task->win_left=left;
    task->win_right=right;
    TaskDerivedValsUpdate(task);
    return TRUE;
  } else {
    return FALSE;
  }
}

public Bool WinVert(I64 top,I64 bottom,CTask *task=NULL)
{//Set task's win top and bottom rows.
  I64 d=bottom-top;
  if (!task) task=Fs;
  if (!TaskValidate(task)) return FALSE;
  if (d<0) d=0;
  if (top>=TEXT_ROWS) {
    top=TEXT_ROWS-1;
    bottom=top+d;
  }
  if (bottom<=0) {
    bottom=1;
    top=bottom-d;
  }
  if (top>bottom) {
    if (top>=0)
      bottom=top;
    else
      top=bottom;
  }
  if (task->win_top!=top || task->win_bottom!=bottom) {
    task->win_top=top;
    task->win_bottom=bottom;
    TaskDerivedValsUpdate(task);
    return TRUE;
  } else {
    return FALSE;
  }
}

public U0 WinTileVert()
{//Tile windows vertically side-by-side.
  CTask *task,*last_task=Fs;
  I64 cnt,c,i,horz_size,no_border;
  PUSHFD
  CLI //TODO Multiprocessor safe
  task=sys_winmgr_task;
  cnt=0;
  do {
    if (!Bt(&task->win_inhibit,WIf_SELF_FOCUS))
      cnt++;
    task=task->last_task;
  } while (task!=sys_winmgr_task);

  task=sys_winmgr_task;
  i=0;
  do {
    if (!Bt(&task->win_inhibit,WIf_SELF_FOCUS)) {
      no_border=Bt(&task->display_flags,DISPLAYf_NO_BORDER);
      c=cnt- i&~3;
      if (!c)
	c=1;
      else if (c>4)
	c=4;
      horz_size=TEXT_COLS/c;
      WinHorz((i&3)*horz_size+1-no_border,(i&3+1)*horz_size-1+no_border,task);
      WinVert(2-no_border,TEXT_ROWS-2+no_border,task);
      last_task=task;
      if (i&3==3)
	WinHorz(task->win_left,TEXT_COLS-2,task);
      i++;
    }
    task=task->last_task;
  } while (task!=sys_winmgr_task);
  WinHorz(last_task->win_left,TEXT_COLS-2,last_task);
  POPFD
}

public Bool WinBorder(Bool val=OFF,CTask *task=NULL)
{//Turn off (or on) window border.
  Bool old_has_border;
  if (!task) task=Fs;
  if (!TaskValidate(task)) return FALSE;
  old_has_border=!Bt(&task->display_flags,DISPLAYf_NO_BORDER);
  if (val) {
    if (!old_has_border) {
      LBtr(&task->display_flags,DISPLAYf_NO_BORDER);
      task->win_left++; task->win_right--;
      task->win_top++;	task->win_bottom--;
      TaskDerivedValsUpdate(task,FALSE);
    }
  } else {
    if (old_has_border) {
      LBts(&task->display_flags,DISPLAYf_NO_BORDER);
      task->win_left--; task->win_right++;
      task->win_top--;	task->win_bottom++;
      TaskDerivedValsUpdate(task,FALSE);
    }
  }
  return old_has_border;
}

public U0 WinMax(CTask *task=NULL)
{//Maximize task's window
  I64 no_border;
  if (!task) task=Fs;
  if (!TaskValidate(task)) return;
  no_border=Bt(&task->display_flags,DISPLAYf_NO_BORDER);
  WinHorz(1-no_border,TEXT_COLS-2+no_border,task);
  WinVert(2-no_border,TEXT_ROWS-2+no_border,task);
  WinToTop(task);
}

public U0 WinScrollNull(CTask *task,CD3I64 *s)
{//If panning a window has been done, restore to zero.
  s->x=task->scroll_x;
  s->y=task->scroll_y;
  s->z=task->scroll_z;
  task->scroll_x=0;
  task->scroll_y=0;
  task->scroll_z=0;
}

public U0 WinScrollRestore(CTask *task,CD3I64 *s)
{//Set window pan value to stored value.
  task->scroll_x=s->x;
  task->scroll_y=s->y;
  task->scroll_z=s->z;
}

//V5.03 Adam/Win.HC DrawMs, without its PUSHFD/CLI/POPFD (one core).
U0 DrawMs(CDC *dc)
{
  I64 x,y;
  x=ms.pos.x;
  y=ms.pos.y;
  if (ms.show && ms_hard.installed) {
    if (!Bt(&sys_run_level,RLf_VGA)) //if text mode
      gr.text_base[ms.pos_text.x+ms.pos_text.y*TEXT_COLS]^=0x7F00;
    else {
      if (gr.fp_draw_ms) {
	if (ms.lb)
	  dc->color=ROP_XOR+LTPURPLE^TRANSPARENT;
	else if (ms.rb)
	  dc->color=ROP_XOR+LTCYAN^TRANSPARENT;
	else
	  dc->color=ROP_XOR+BLACK^TRANSPARENT;
	if (winmgr.grab_scroll && gr.fp_draw_grab_ms)
	  (*gr.fp_draw_grab_ms)(dc,x,y,winmgr.grab_scroll_closed);
	else
	  (*gr.fp_draw_ms)(dc,x,y);
      }
    }
  }
}

U0 WinFinalUpdate(CDC *dc)
{
  if (ms_grid.show)
    DrawWinGrid(dc);
  if (ms_grid.coord)
    GrPrint(dc,GR_WIDTH-FONT_WIDTH*10,FONT_HEIGHT*3,
	  "(%03d,%03d)",ms.pos.x,ms.pos.y);
  DrawProgressBars(dc);
  if (winmgr.show_menu)
    DrawMenu(dc);
  else
    sys_cur_submenu_entry=NULL;
  DrawMs(dc);
}

gr.fp_final_scrn_update=&WinFinalUpdate;

Bool WinInside(I64 x,I64 y,CTask *task=NULL,I64 border=0)
{//Is pixel (x,y) inside task's win? Border to FONT_WIDTH.
  if (!task) task=Fs;
  if (TaskValidate(task) && Bt(&task->display_flags,DISPLAYf_SHOW)) {
    if (Bt(&task->display_flags,DISPLAYf_NO_BORDER))
      border=0;
    if (task->pix_left-border<=x<=task->pix_right+border &&
	  task->pix_top-border<=y<=task->pix_bottom+border)
      return TRUE;
  }
  return FALSE;
}

U0 WinMsUpdate()
{//V5.03 Adam/Win.HC without its gr.scrn_zoom tail: the runtime has no zoom.
  Bool set=FALSE;
  if (ms_hard.installed) {
    ms.has_wheel=ms_hard.has_wheel;
    if (ms_hard.evt) {
      MsUpdate(ms_hard.pos.x,ms_hard.pos.y,ms_hard.pos.z,
	    ms_hard.bttns[0],ms_hard.bttns[1]);
      ms_hard.evt=FALSE;
      set=TRUE;
    }
  }

  if (set) {
    if (ms_hard.installed) {
      ms.speed=ms_hard.speed;
      ms.timestamp=ms_hard.timestamp;
    }
  } else
    ms.speed*=0.95;
}

//V5.03 Adam/Win.HC WinRefocus, without its PUSHFD/CLI/POPFD (one core).
public CTask *WinRefocus(CTask *task=NULL)
{//Reset the focus task if NULL.
  if (!task) {
    task=sys_winmgr_task->last_task;
    while (TaskValidate(task) && task!=sys_winmgr_task) {
      if (!Bt(&task->win_inhibit,WIf_SELF_FOCUS)) {
	sys_focus_task=task;
	break;
      }
      task=task->last_task;
    }
  }
  return sys_focus_task;
}
