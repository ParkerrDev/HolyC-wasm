//Native V5.03 document state, window geometry, ordering and callback ownership.
export const DOC_TYPES_SRC=String.raw`//DolDoc records from TempleOS V5.03 Kernel/KernelA.HH.

public class CDocBin
{
  CDocBin *next,*last;
  I32	tmp_use_cnt,renum_num;
  U8	*tag;
  U0	start;
  U32	num,flags,size,use_cnt;
  U0	end;
  U8	*data;
};

public class CDocSettings
{
  U32	final_u32_attr;
  I16	left_margin,right_margin,indent;
  U16	page_len,header,footer;
  I8	shifted_x,shifted_y;
  U8	state,comment_depth,paren_depth,brace_depth,
	cur_text_attr,dft_text_attr;
};

public class CDocEntryBase
{
//This is a shortened structure for
  //cmds like the text cmd which
  //don't require the full CDocEntry structure.
  CDocEntryBase *next,*last;
  U8	*tag;
  union {
    U8	type_u8; //this stores the code
    U32 type; //these store attr flags
  };
  I32	page_line_num;
  I64	de_flags;
  I32	x,y;
  U32	min_col,max_col;
  CDocSettings settings;
  I64	user_data;
};

public class CDocEntry:CDocEntryBase
{
  union {
    I64 attr;
    I64 cursor_x_offset;
    I64 (*left_cb)(CDoc *doc,CDocEntry *doc_e);
    I64 left_exp;
  };
  U8	*left_macro;

  union {
    I64 cursor_y_offset;
    I64 (*right_cb)(CDoc *doc,CDocEntry *doc_e);
    I64 right_exp;
  };
  U8	*right_macro;

  U8	*(*tag_cb)(CDoc *doc,CDocEntry *doc_e,CTask *mem_task);
  U8	*define_str,
	*aux_str,
	*bin_ptr_link,
	*html_link,
	*my_fmt_data;
  I64	hex_ed_width;
  I32	scroll_len,
	len, //$LK,"DOCE_LEN_DFT",A="MN:DOCE_LEN_DFT"$
	bin_num;
  U8	raw_type,pad[3];
  CDocBin *bin_data;
  U8	*data;
};

class CEdFindText
{
  U8	find_text[STR_LEN],
	replace_text[STR_LEN];
  Bool	replace,
	scan_fwd,
	scan_sel_text,
	match_case,
	whole_labels,
	local_var,
	pmt,pad;
  I64	filter_lines;
};

class CEdFileName
{
  CDirContext *dirc;
  U8	name[256];
};

class CDocUndo
{
  CDocUndo *next,*last;
  I64	size,doc_flags,time_stamp;
  U8	*body;
};

public class CDoc //Linked Text File header
{//See $LK,"Doc",A="HI:Doc"$ for documentation.
  CDocEntryBase head;
  I64	flags,locked_flags;
  CDocEntry *cur_entry,*old_cur_entry;
  I32	cur_col,old_cur_col,
	line_start_col,top_line_num,
	dollar_buf_size,dollar_buf_ptr;
  U8	*dollar_buf; //When entering $$ cmds, it buffers them until the end $$.

  CTask *win_task,*mem_task,*owning_task;
  I32	page_line_num,undo_cnt,
	x,y,min_x,max_x,min_y,max_y;
  I64	line,col,best_d,
	old_win_top,old_win_bottom,
	old_win_left,old_win_right,
	cmd_U8;
  U32	doc_signature,cur_bin_num;
  I64	max_entries,
	updates_cnt;
  CEdFindText *find_replace;

  CEdFileName filename;
  I64	file_attr;
  I64	(*left_click_link)(CDoc *doc,CDocEntry *doc_e);
  I64	(*right_click_link)(CDoc *doc,CDocEntry *doc_e);

  //See $LK,"::/Apps/Psalmody/JukeBox.HC"$
  U8	*user_put_data; //Passed to user_put_key() and user_put_s()
  Bool	(*user_put_key)(CDoc *doc,U8 *data,I64 ch,I64 sc);
  Bool	(*user_put_s)(CDoc *doc,U8 *data,U8 *st);

  CDoc	*parent_doc; //(When browsing deeper, opening deeper docs.)
  U64	desc; //8 characters. See $LK,"DocBorderLstDraw",A="MN:DocBorderLstDraw"$().

  CDocBin bin_head;
  CDocSettings settings_head;
  CDocUndo undo_head;

  I64	user_data;
};

#define DOC_SIGNATURE_VAL 'DocS'
#define DOCf_HIDE_CURSOR 11
#define DOCf_DONT_HIGHLIGHT_CURSOR 12
#define DOCf_NO_SCROLL_BARS 13
`;

export const WINDOW_SRC=String.raw`//Document selection and flags from V5.03 Adam/DolDoc.

public CDoc *DocPut(CTask *task=NULL)
{//Current document that StdOut Put() goes to.
//Basically, StdOut unless double buffering.
  CDoc *res;
  if (!task) task=Fs;
  if (Bt(&task->task_flags,TASKf_INPUT_FILTER_TASK))
    task=task->parent_task;
  if ((res=task->put_doc) && res->doc_signature==DOC_SIGNATURE_VAL)
    return res;
  else
    return NULL;
}

public CDoc *DocDisplay(CTask *task=NULL)
{//StdOut displayed unless double buffering.
  CDoc *res;
  if (!task) task=Fs;
  if ((res=task->display_doc) && res->doc_signature==DOC_SIGNATURE_VAL)
    return res;
  else
    return NULL;
}

public CDoc *DocBorder(CTask *task=NULL)
{//Doc holding border of window text.
  CDoc *res;
  if (!task) task=Fs;
  if ((res=task->border_doc) && res->doc_signature==DOC_SIGNATURE_VAL)
    return res;
  else
    return NULL;
}

public Bool DocCursor(Bool show=OFF,CDoc *doc=NULL)
{//Show or hide cursor.
  if (!doc && !(doc=DocPut))
    return FALSE;
  return !LBEqu(&doc->flags,DOCf_HIDE_CURSOR,!show);
}

public Bool DocHighlightCursor(Bool show=OFF,CDoc *doc=NULL)
{//Highlight or Don't highlight cursor.
  if (!doc && !(doc=DocPut))
    return FALSE;
  return !LBEqu(&doc->flags,DOCf_DONT_HIGHLIGHT_CURSOR,!show);
}

public Bool DocScroll(Bool val=OFF,CDoc *doc=NULL)
{//Turn scroll bars OFF/ON.
  if (!doc && !(doc=DocPut))
    return FALSE;
  return !LBEqu(&doc->flags,DOCf_NO_SCROLL_BARS,!val);
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
//V5.03 DolDoc locking; Break delivery belongs to the task runtime.
#define DOClf_LOCKED 0
#define DOCf_BREAK_UNLOCKED 22

public Bool DocLock(CDoc *doc)
{//Make this task have exclusive access to this doc.
  if (!Bt(&doc->locked_flags,DOClf_LOCKED) || doc->owning_task!=Fs) {
    while (LBts(&doc->locked_flags,DOClf_LOCKED))
      Yield;
    if (doc->owning_task!=Fs)
      LBEqu(&doc->flags,DOCf_BREAK_UNLOCKED,BreakLock(Fs));
    doc->owning_task=Fs;
    return TRUE;
  } else
    return FALSE;
}

public Bool DocUnlock(CDoc *doc)
{//Release exclusive lock on access to doc.
  Bool unlock_break;
  if (Bt(&doc->locked_flags,DOClf_LOCKED) && doc->owning_task==Fs) {
    doc->owning_task=0;
    unlock_break=Bt(&doc->flags,DOCf_BREAK_UNLOCKED);
    LBtr(&doc->locked_flags,DOClf_LOCKED);
    if (unlock_break)
      BreakUnlock(Fs);
    return TRUE;
  } else
    return FALSE;
}
`;
