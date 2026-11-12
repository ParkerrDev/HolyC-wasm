//Normal document layout; unsupported active modes are checked before mutation.
export const DOC_RECALC_SRC=String.raw`
Bool DocHostWildMatch(U8 *test_str,U8 *wild_str)
{//Wildcard match with '*' and '?'.
  I64 ch1,ch2;
  U8 *fall_back_src=NULL,*fall_back_wild=NULL;
  while (TRUE) {
    if (!(ch1=*test_str++)) {
      if (*wild_str && *wild_str!='*')
	return FALSE;
      else
	return TRUE;
    } else {
      if (!(ch2=*wild_str++))
	return FALSE;
      else {
	if (ch2=='*') {
	  fall_back_wild=wild_str-1;
	  fall_back_src=test_str;
	  if (!(ch2=*wild_str++))
	    return TRUE;
	  while (ch2!=ch1)
	    if (!(ch1=*test_str++))
	      return FALSE;
	} else
	  if (ch2!='?' && ch1!=ch2) {
	    if (fall_back_wild) {
	      wild_str=fall_back_wild;
	      test_str=fall_back_src;
	      fall_back_wild=NULL;
	      fall_back_src=NULL;
	    } else
	      return FALSE;
	  }
      }
    }
  }
}
#define DOCF_PLAIN_TEXT 1
#define DOCF_PLAIN_TEXT_TABS 2
#define DOCF_NO_CURSOR 8
#define DOCF_BORDER_DOC 0x100
#define DOCF_SIZE_MIN 0x400
#define DOCF_HAS_SONG 0x10000
#define DOCF_WORD_WRAP DOCEF_WORD_WRAP
#define DOCF_HIGHLIGHT DOCEF_HIGHLIGHT
#define DOCF_BLINK DOCEF_BLINK
#define DOCF_INVERT DOCEF_INVERT
#define DOCF_UNDERLINE DOCEF_UNDERLINE
#define DOC_COLOR_PMT GREEN
#define DOCSS_NORMAL 0
#define DOCSS_CPP_Z_COMMENT 4
#define RECALCt_NORMAL 0
#define RECALCt_FIND_CURSOR 1
#define RECALCt_TO_SCRN 2
#define RECALCG_MASK 0xFF
#define RECALCF_HAS_CURSOR 0x100
#define RECALCF_ADD_CURSOR 0x200
#define RECALCF_TO_HTML 0x400

Bool DocHostSourceName(U8 *name)
{//Apply the native source mask to the last pathname component.
  U8 *ptr=name;
  while (*ptr)
    if (*ptr++=='/') name=ptr;
  return DocHostWildMatch(name,"*.HC*") ||
	DocHostWildMatch(name,"*.HH*") ||
	DocHostWildMatch(name,"*.IN*") ||
	DocHostWildMatch(name,"*.PRJ*");
}

Bool DocHostRecalcCheck(CDoc *doc,I64 flags,Bool repeated=FALSE,
	Bool text_after=FALSE)
{//Reject active capabilities this finite normal-layout pass cannot perform.
  CDocEntry *entry=doc->head.next;
  I64 page_len=doc->settings_head.page_len,
	header=doc->settings_head.header,footer=doc->settings_head.footer,
	held=0,k,source_highlight,highlight,
	page_min=page_len,header_max=header,footer_max=footer,
	has_text=FALSE,any_high;
  repeated|=doc->max_entries!=I64_MAX;
  if (flags || !doc->win_task || doc->flags&DOCF_HAS_SONG)
    throw('DocMode');
  source_highlight=
	!(doc->flags&(DOCF_PLAIN_TEXT|DOCF_PLAIN_TEXT_TABS)) &&
	DocHostSourceName(doc->filename.name);
  highlight=any_high=source_highlight;
  if (!page_len || header+footer>=page_len) throw('DocPage');
  while (entry!=doc) {
    if (entry->type_u8>DOCT_BTTN ||
	entry->de_flags&(DOCEF_TAG_CB|DOCEF_DEFINE|DOCEF_REFRESH_DATA|
	DOCEF_TREE|DOCEF_LST|DOCEF_HAS_BIN|DOCEF_HAS_BORDER|
	DOCEF_SCROLLING_X|DOCEF_REMALLOC_DATA)) throw('DocCaps');
    if (entry->de_flags&DOCEF_TAG && !entry->tag) throw('DocTag');
    if (!(entry->de_flags&(DOCEF_SKIP|DOCEF_FILTER_SKIP))) {
      if (entry->type_u8==DOCT_TEXT && entry->de_flags&DOCEF_TAG) {
	has_text=TRUE;
	if (highlight) throw('DocHigh');
      }
      switch (entry->type_u8) {
	case DOCT_HIGHLIGHT:
	  highlight=ToBool(entry->attr);
	  if (highlight) any_high=TRUE;
	  break;
	case DOCT_CLEAR:
	  repeated=TRUE;
	  break;
	case DOCT_PAGE_LEN:
	  page_len=entry->attr&0xFFFF;
	  if (entry->de_flags&DOCEF_WIN_REL)
	    page_len=(page_len+doc->win_task->win_height)&0xFFFF;
	  break;
	case DOCT_HEADER:
	  header=entry->attr&0xFFFF;
	  break;
	case DOCT_FOOTER:
	  footer=entry->attr&0xFFFF;
	  break;
      }
      if (!page_len || header+footer>=page_len) throw('DocPage');
      if (page_len<page_min) page_min=page_len;
      if (header>header_max) header_max=header;
      if (footer>footer_max) footer_max=footer;
    }
    if (entry->de_flags&(DOCEF_HOLD|DOCEF_FILTER_SKIP)) {
      held++;
      if (!(entry->de_flags&(DOCEF_SKIP|DOCEF_FILTER_SKIP)) &&
	    IsEditableText(entry) && entry->tag) {
	k=StrLen(entry->tag);
	if (k>1) held+=k-1;
      }
    }
    entry=entry->next;
  }
  if (doc->max_entries<0 || doc->max_entries!=I64_MAX && held>1024)
    throw('DocLimit');
  if (text_after && highlight) throw('DocHigh');
  if (repeated) {
    if (has_text && any_high) throw('DocHigh');
    if (header_max+footer_max>=page_min) throw('DocPage');
  }
  return source_highlight;
}

extern Bool DocRecalc(CDoc *doc,I64 recalc_flags=RECALCt_NORMAL);

U0 DocHostRecalcPass(CDoc *doc,Bool source_highlight)
{//The normal, full-refresh path of the V5.03 layout pass.
  I64 i,k,x=0,y=0,x0,y0,col2,num_entries=0,cur_u8_attr,
	cursor_y=I64_MIN,left_margin,right_margin,top,left,bottom,right,
	width,height,best_col=0,page_len;
  CDocEntry *doc_e,*doc_e2,*best_doc_e=doc->cur_entry,
	*next_clear_found=NULL;
  CDocSettings *s;
  Bool del_doc_e,same_win,clear_holds=FALSE;
  CTask *win_task=doc->win_task;

  left=win_task->win_left;right=win_task->win_right;
  width=win_task->win_width;height=win_task->win_height;
  top=win_task->win_top;bottom=win_task->win_bottom;
  left_margin=left;right_margin=right;
  if (source_highlight) doc->flags|=DOCF_HIGHLIGHT;
  else doc->flags&=~DOCF_HIGHLIGHT;
  doc->page_line_num=0;
  doc->x=doc->y=0;
  if (doc->flags&DOCF_BORDER_DOC) {
    doc->top_line_num=0;
    doc->line_start_col=0;
  }
  x0=doc->line_start_col;y0=doc->top_line_num;
  same_win=top==doc->old_win_top && bottom==doc->old_win_bottom &&
	left==doc->old_win_left && right==doc->old_win_right &&
	doc->cur_entry==doc->old_cur_entry && doc->cur_col==doc->old_cur_col;
  if (doc->cur_col<=doc->cur_entry->min_col)
    doc->cur_col=doc->cur_entry->min_col;
  doc_e=doc->head.next;
  doc_e->de_flags&=~(DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT);
  s=&doc->settings_head;
  doc->flags=doc_e->de_flags&(DOCG_BL_IV_UL|DOCEF_WORD_WRAP)|
	doc->flags&~(DOCG_BL_IV_UL|DOCEF_WORD_WRAP);
  cur_u8_attr=s->cur_text_attr;
  doc->flags&=~DOCF_BWD_MOVEMENT;
  if (doc->head.next==doc) {
    best_doc_e=doc;
    doc->cur_entry=doc;
    doc->cur_col=0;
  }
  doc->min_x=I32_MAX;doc->min_y=I32_MAX;
  doc->max_x=I32_MIN;doc->max_y=I32_MIN;
  while (doc_e!=doc) {
    while (TRUE) {
      del_doc_e=FALSE;
      if (doc_e->de_flags&(DOCEF_SKIP|DOCEF_FILTER_SKIP)) {
	doc_e2=doc_e;
	goto rc_skip;
      }
      MemCpy(&doc_e->settings,s,sizeof(CDocSettings));
      s=&doc_e->settings;
      k=DocWordWrapDel(doc,doc_e,TRUE,same_win,left_margin,right_margin,
	    &best_doc_e,&best_col);
      if (doc_e->de_flags&(DOCEF_LEFT_X|DOCEF_RIGHT_X|DOCEF_CENTER_X|
	    DOCEF_TOP_Y|DOCEF_BOTTOM_Y|DOCEF_CENTER_Y))
	DocRecalcXY(doc,doc_e,k,left,width,height,left_margin,right_margin,
	      x0,y0,&x,&y);
      if (k>0 && doc->flags&DOCF_WORD_WRAP &&
	    (doc_e2=DocWordWrapAdd(doc,doc_e,&k,left,right_margin,x,y)))
	doc_e=doc_e2;
      else
	break;
    }
    doc_e->x=x;doc_e->y=y;
    doc_e->page_line_num=doc->page_line_num;
    if (x<doc->min_x) doc->min_x=x;
    if (y<doc->min_y) doc->min_y=y;
    col2=0;
    DocTmpAttr(doc,doc_e,cur_u8_attr);
    if (doc_e==doc->cur_entry) cursor_y=doc_e->y;
    if (doc_e->de_flags&DOCEF_TAG) {
      col2+=k;
      x+=k;
    }
    switch (doc_e->type_u8) {
      case DOCT_TEXT:
	if (!col2 && !(doc_e->de_flags
	      &(DOCEF_TREE|DOCEF_LST|DOCEF_TAG_CB|DOCEF_DEFINE|
	      DOCEF_AUX_STR|DOCEF_HTML_LINK|DOCEF_BIN_PTR_LINK)))
	  del_doc_e=TRUE;
	break;
      case DOCT_NEW_LINE:
      case DOCT_SOFT_NEW_LINE:
	if (doc_e->de_flags&DOCEF_HIGHLIGHT && s->state==DOCSS_CPP_Z_COMMENT)
	  s->state=DOCSS_NORMAL;
	y++;
	doc->page_line_num++;
rc_start_of_line:
	if (s->left_margin==DOC_DFT)
	  x=s->indent;
	else
	  x=s->indent+s->left_margin;
rc_adjust_xy:
	page_len=s->page_len;
	i=s->indent+s->left_margin;
	if (x<i)
	  x=i;
	if (doc->page_line_num<0)
	  doc->page_line_num=s->page_len+doc->page_line_num%page_len;
	else {
	  if (doc->page_line_num>=s->page_len) {
	    doc->page_line_num-=s->page_len;
	    if (doc->page_line_num>=s->page_len) //avoid extra divide
	      doc->page_line_num=doc->page_line_num%page_len;
	  }
	}
	if (s->header!=DOC_DFT) {
	  if (doc->page_line_num<s->header) {
	    y+=s->header-doc->page_line_num;
	    doc->page_line_num=s->header;
	    goto rc_start_of_line;
	  }
	}
	if (s->footer==DOC_DFT) {
	  if (doc->page_line_num>=s->page_len) {
	    if (s->header==DOC_DFT)
	      doc->page_line_num=0;
	    else {
	      doc->page_line_num=s->header;
	      y+=s->header;
	    }
	    goto rc_start_of_line;
	  }
	} else {
	  if (doc->page_line_num>=s->page_len-s->footer) {
	    y+=s->footer;
	    if (s->header==DOC_DFT)
	      doc->page_line_num=0;
	    else {
	      doc->page_line_num=s->header;
	      y+=s->header;
	    }
	    goto rc_start_of_line;
	  }
	}
	break;
      case DOCT_TAB:
	x=(x+8)&~7;
	break;
      case DOCT_PAGE_BREAK:
	doc->flags|=DOCF_BWD_MOVEMENT;
	y+=s->page_len-doc_e->page_line_num;
	doc->page_line_num=0;
	goto rc_start_of_line;
      case DOCT_CURSOR:
	if (!(doc->flags & DOCF_NO_CURSOR)) {
	  doc->cur_entry=doc_e->next;
	  doc->cur_col=doc->cur_entry->min_col;
	}
	del_doc_e=TRUE;
	break;
      case DOCT_PMT:
	cur_u8_attr=cur_u8_attr&0xF0|DOC_COLOR_PMT;
	if (y==cursor_y) {
	  doc->cur_entry=doc_e->next;
	  doc->cur_col=doc->cur_entry->min_col;
	}
	break;
      case DOCT_CLEAR:
	next_clear_found=doc_e;
	if (doc_e->de_flags&DOCEF_HOLD)
	  clear_holds=TRUE;
	else
	  clear_holds=FALSE;
	break;
      case DOCT_PAGE_LEN:
	s->page_len=doc_e->attr;
	if (doc_e->de_flags & DOCEF_WIN_REL)
	  s->page_len+=height;
	goto rc_adjust_xy;
      case DOCT_LEFT_MARGIN:
	i=doc_e->attr;
	left_margin=left+i;
	s->left_margin=i;
	goto rc_start_of_line;
      case DOCT_RIGHT_MARGIN:
	if (doc_e->de_flags & DOCEF_WIN_REL)
	  i=width-1-doc_e->attr;
	else
	  i=doc_e->attr;
	right_margin=left+i;
	s->right_margin=i;
	goto rc_adjust_xy;
      case DOCT_HEADER:
	s->header=doc_e->attr;
	goto rc_adjust_xy;
      case DOCT_FOOTER:
	s->footer=doc_e->attr;
	goto rc_adjust_xy;
      case DOCT_INDENT:
	if (doc_e->de_flags & DOCEF_LEFT_X)
	  i=doc_e->attr;
	else
	  i=s->indent+doc_e->attr;
	s->indent=i;
	goto rc_start_of_line;
      case DOCT_FOREGROUND:
	cur_u8_attr&=0xF0;
	if (doc_e->attr==DOC_DFT)
	  cur_u8_attr|=s->dft_text_attr&0x0F;
	else
	  cur_u8_attr|=doc_e->attr;
	s->cur_text_attr=cur_u8_attr;
	break;
      case DOCT_BACKGROUND:
	cur_u8_attr&=0x0F;
	if (doc_e->attr==DOC_DFT)
	  cur_u8_attr|=s->dft_text_attr&0xF0;
	else
	  cur_u8_attr|=doc_e->attr<<4;
	s->cur_text_attr=cur_u8_attr;
	break;
      case DOCT_DFT_FOREGROUND:
	cur_u8_attr&=0xF0;
	if (doc_e->attr==DOC_DFT)
	  cur_u8_attr|=s->dft_text_attr&0xF;
	else
	  cur_u8_attr|=doc_e->attr;
	s->dft_text_attr=s->dft_text_attr&0xF0|cur_u8_attr&0x0F;
	s->cur_text_attr=cur_u8_attr;
	break;
      case DOCT_DFT_BACKGROUND:
	cur_u8_attr&=0x0F;
	if (doc_e->attr==DOC_DFT)
	  cur_u8_attr|=s->dft_text_attr&0xF0;
	else
	  cur_u8_attr|=doc_e->attr<<4;
	s->dft_text_attr=s->dft_text_attr&0x0F|cur_u8_attr&0xF0;
	s->cur_text_attr=cur_u8_attr;
	break;
      case DOCT_WORD_WRAP:
	if (doc_e->attr)
	  doc->flags|=DOCF_WORD_WRAP;
	else
	  doc->flags&=~DOCF_WORD_WRAP;
	break;
      case DOCT_HIGHLIGHT:
	if (doc_e->attr)
	  doc->flags|=DOCF_HIGHLIGHT;
	else
	  doc->flags&=~DOCF_HIGHLIGHT;
	break;
      case DOCT_BLINK:
	if (doc_e->attr)
	  doc->flags|=DOCF_BLINK;
	else
	  doc->flags&=~DOCF_BLINK;
	break;
      case DOCT_INVERT:
	if (doc_e->attr)
	  doc->flags|=DOCF_INVERT;
	else
	  doc->flags&=~DOCF_INVERT;
	break;
      case DOCT_UNDERLINE:
	if (doc_e->attr)
	  doc->flags|=DOCF_UNDERLINE;
	else
	  doc->flags&=~DOCF_UNDERLINE;
	break;
      case DOCT_SHIFTED_X:
	s->shifted_x=doc_e->attr;
	break;
      case DOCT_SHIFTED_Y:
	s->shifted_y=doc_e->attr;
	break;
      case DOCT_CURSOR_MOVEMENT:
	doc->flags|=DOCF_BWD_MOVEMENT;
	x+=doc_e->cursor_x_offset;
	if (doc_e->de_flags & DOCEF_PAGE_REL_Y) {
	  i=doc->page_line_num;
	  if (doc_e->de_flags & DOCEF_TOP_Y)
	    doc->page_line_num=0;
	  else if (doc_e->de_flags & DOCEF_BOTTOM_Y)
	    doc->page_line_num=s->page_len-1;
	  else if (doc_e->de_flags & DOCEF_CENTER_Y)
	    doc->page_line_num=s->page_len>>1;
	  y+=doc->page_line_num-i;
	}
	y+=doc_e->cursor_y_offset;
	doc->page_line_num+=doc_e->cursor_y_offset;
	goto rc_adjust_xy;
      default:
	break;
    }
    switch (doc_e->type_u8) {
      case DOCT_BTTN:
      case DOCT_LINK:
	doc_e->max_col=1;
	break;
      default:
	doc_e->max_col=col2;
    }
    if (x>doc->max_x) doc->max_x=x;
    if (y>doc->max_y) doc->max_y=y;
    doc_e2=doc_e->next;
rc_skip:
    while (doc_e2!=doc && doc_e2->de_flags&(DOCEF_SKIP|DOCEF_FILTER_SKIP)) {
      if (doc_e2==doc->cur_entry) {
	doc->cur_entry=doc_e2->next;
	doc->cur_col=doc->cur_entry->min_col;
      }
      doc_e2->x=x;doc_e2->y=y;
      doc_e2->page_line_num=doc->page_line_num;
      MemCpy(&doc_e2->settings,s,sizeof(CDocSettings));
      doc_e2->type.u8[1]=cur_u8_attr;
      doc_e2->de_flags=doc->flags&
	    (DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT)|
	    doc_e2->de_flags&~(DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT);
      doc_e2=doc_e2->next;
    }
    if (del_doc_e && !(doc_e->de_flags&(DOCEF_HOLD|DOCEF_FILTER_SKIP))) {
      if (doc_e==doc->cur_entry) {
	doc->cur_entry=doc_e2;
	doc->cur_col=doc_e2->min_col;
      }
      if (best_doc_e==doc_e) {
	best_doc_e=doc_e2;
	best_col=doc_e2->min_col;
      }
      DocEntryDel(doc,doc_e);
    }
    num_entries++;
    doc_e=doc_e2;
  }
  if (doc->min_x>doc->max_x) doc->min_x=doc->max_x=0;
  if (doc->min_y>doc->max_y) doc->min_y=doc->max_y=0;
  doc_e->x=x;doc_e->y=y;
  doc_e->page_line_num=doc->page_line_num;
  MemCpy(&doc_e->settings,s,sizeof(CDocSettings));
  doc_e->type.u8[1]=cur_u8_attr;
  if (doc->flags&DOCF_SIZE_MIN) {
    if (Bt(&win_task->display_flags,DISPLAYf_NO_BORDER)) {
      if (left<0) left=0;
      i=left+doc->max_x-doc->min_x;
      if (i>TEXT_COLS-1) i=TEXT_COLS-1;
      WinHorz(left,i,win_task);
      if (top<0) top=0;
      i=top+doc->max_y-doc->min_y;
      if (i>TEXT_ROWS-1) i=TEXT_ROWS-1;
      WinVert(top,i,win_task);
    } else {
      if (left<1) left=1;
      i=left+doc->max_x-doc->min_x;
      if (i>TEXT_COLS-2) i=TEXT_COLS-2;
      WinHorz(left,i,win_task);
      if (top<1) top=1;
      i=top+doc->max_y-doc->min_y;
      if (i>TEXT_ROWS-2) i=TEXT_ROWS-2;
      WinVert(top,i,win_task);
    }
  }
  doc->y=doc->cur_entry->y;
  doc->x=doc->cur_entry->x+doc->cur_col;
  doc->line=doc->y+1;doc->col=doc->x+1;
  if (!same_win) {
    doc->old_win_top=top;doc->old_win_bottom=bottom;
    doc->old_win_left=left;doc->old_win_right=right;
    doc->old_cur_entry=doc->cur_entry;
    doc->old_cur_col=doc->old_cur_col;
  }
  i=num_entries-doc->max_entries;
  if (next_clear_found) {
    DocDelToEntry(doc,next_clear_found,clear_holds);
    DocRecalc(doc);
  } else if (i>1024) {
    DocDelToNum(doc,i);
    DocRecalc(doc);
  }
}

U0 DocHostRecalcUnlock(CDoc *doc,Bool marker)
{//Restore failure-only bookkeeping even when a pending break propagates.
  try
    DocUnlock(doc);
  catch
    LBEqu(&doc->flags,DOCf_BREAK_UNLOCKED,marker);
  LBEqu(&doc->flags,DOCf_BREAK_UNLOCKED,marker);
}

public Bool DocRecalc(CDoc *doc,I64 recalc_flags=RECALCt_NORMAL)
{//Recalculate the supported normal document layout.
  Bool unlock,marker,source_highlight,res=FALSE;
  if (!doc || doc->doc_signature!=DOC_SIGNATURE_VAL) return FALSE;
  while (Bt(&doc->locked_flags,DOClf_LOCKED) && doc->owning_task!=Fs)
    Yield;
  DocHostRecalcCheck(doc,recalc_flags);
  marker=Bt(&doc->flags,DOCf_BREAK_UNLOCKED);
  unlock=DocLock(doc);
  try {
    if (doc->doc_signature==DOC_SIGNATURE_VAL) {
      source_highlight=DocHostRecalcCheck(doc,recalc_flags);
      DocHostRecalcPass(doc,source_highlight);
      res=TRUE;
    }
  } catch {
    if (unlock) DocHostRecalcUnlock(doc,marker);
  }
  if (unlock) DocUnlock(doc);
  return res;
}
`;
