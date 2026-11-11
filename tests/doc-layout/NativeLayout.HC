I64 DocWordWrapDel(CDoc *doc,CDocEntry *doc_e,
	Bool full_refresh,Bool same_win,I64 left_margin,I64 right_margin,
	CDocEntry **_best_doc_e,I64 *_best_col)
{
  CDocEntry *doc_e2;
  U8 *ptr;
  I64 j,k;
  if (doc_e->de_flags&DOCEF_TAG && doc_e->tag)
    k=StrLen(doc_e->tag);
  else
    k=0;
  if (full_refresh)
    while (TRUE) {
      doc_e2=doc_e->next;
      if (doc_e2->type_u8==DOCT_SOFT_NEW_LINE && !same_win) {
	if (doc->cur_entry==doc_e2) {
	  doc->cur_entry=doc_e2->next;
	  doc->cur_col=doc->cur_entry->min_col;
	}
	if (*_best_doc_e==doc_e2) {
	  *_best_doc_e=doc_e2->next;
	  *_best_col=0;
	}
	DocEntryDel(doc,doc_e2);
      } else if (IsEditableText(doc_e) &&
	    doc_e->de_flags==doc_e2->de_flags && doc_e->type==doc_e2->type) {
	j=StrLen(doc_e2->tag);
	ptr=MAlloc(k+j+1,doc->mem_task);
	MemCpy(ptr,doc_e->tag,k);
	MemCpy(ptr+k,doc_e2->tag,j+1);
	Free(doc_e->tag);
	doc_e->tag=ptr;
	if (doc->cur_entry==doc_e2) {
	  doc->cur_entry=doc_e;
	  doc->cur_col+=k;
	}
	if (*_best_doc_e==doc_e2) {
	  *_best_doc_e=doc_e;
	  *_best_col=0;
	}
	DocEntryDel(doc,doc_e2);
	k+=j;
	if (k>(right_margin-left_margin+1)<<1)
	  break;
      } else
	break;
    }
  if (doc_e->de_flags & DOCEF_SCROLLING_X)
    k=doc_e->scroll_len;
  return k;
}

U0 DocRecalcXY(CDoc *doc,CDocEntry *doc_e,
	I64 k,I64 left,I64 width,I64 height,I64 left_margin,I64 right_margin,
	I64 x0,I64 y0,I64 *_x,I64 *_y)
{
  I64 i,x=*_x,y=*_y;
  if (doc_e->de_flags & DOCEF_MARGIN_REL_X) {
    if (doc_e->de_flags & DOCEF_LEFT_X)
      x=left_margin-left;
    else if (doc_e->de_flags & DOCEF_RIGHT_X)
      x=right_margin-(k-1)-left;
    else if (doc_e->de_flags & DOCEF_CENTER_X)
      x=(right_margin+left_margin)>>1-k>>1-left;
  } else {
    if (doc_e->de_flags & DOCEF_LEFT_X)
      x=x0;
    else if (doc_e->de_flags & DOCEF_RIGHT_X)
      x=width+x0-k;
    else if (doc_e->de_flags & DOCEF_CENTER_X)
      x=(width+x0-k)>>1;
  }
  i=y;
  if (doc_e->de_flags & DOCEF_PAGE_REL_Y) {
    doc->flags|=DOCF_BWD_MOVEMENT;
    if (doc_e->de_flags & DOCEF_TOP_Y)
      y-=doc_e->page_line_num;
    else if (doc_e->de_flags & DOCEF_BOTTOM_Y)
      y+=doc_e->settings.page_len-doc_e->page_line_num;
    else if (doc_e->de_flags & DOCEF_CENTER_Y)
      y+=doc_e->settings.page_len>>1-doc_e->page_line_num;
  } else {
    doc->flags|=DOCF_BWD_MOVEMENT;
    if (doc_e->de_flags & DOCEF_TOP_Y)
      y=y0;
    else if (doc_e->de_flags & DOCEF_BOTTOM_Y)
      y=height-1+y0;
    else if (doc_e->de_flags & DOCEF_CENTER_Y)
      y=height>>1+y0;
  }
  if (y!=i) {
    doc->page_line_num+=y-i;
    if (doc->page_line_num<0)
      doc->page_line_num=doc_e->settings.page_len+
	    doc->page_line_num%doc_e->settings.page_len;
    else
      doc->page_line_num=doc->page_line_num%doc_e->settings.page_len;
    if (doc_e->settings.header!=DOC_DFT &&
	  doc->page_line_num<doc_e->settings.header) {
      y+=doc_e->settings.header-doc->page_line_num;
      doc->page_line_num=doc_e->settings.header;
    }
    if (doc_e->settings.footer==DOC_DFT) {
      if (doc->page_line_num>=doc_e->settings.page_len) {
	if (doc_e->settings.header==DOC_DFT)
	  doc->page_line_num=0;
	else {
	  doc->page_line_num=doc_e->settings.header;
	  y+=doc_e->settings.header;
	}
      }
    } else {
      if (doc->page_line_num>=
	    doc_e->settings.page_len-doc_e->settings.footer) {
	y+=doc_e->settings.footer;
	if (doc_e->settings.header==DOC_DFT)
	  doc->page_line_num=0;
	else {
	  doc->page_line_num=doc_e->settings.header;
	  y+=doc_e->settings.header;
	}
      }
    }
  }
  *_x=x;
  *_y=y;
}

CDocEntry *DocSplitTag(CDoc *doc,CDocEntry *doc_e,I64 i,I64 x,I64 y,I64 type_u8)
{//Split tag at i, insert DOCT_SOFT_NEW_LINE, DOCT_MARKER or DOCT_CURSOR
  U8 *ptr;
  CDocEntry *doc_e2;
  if (doc_e->type_u8==DOCT_TEXT && i) {
    if (i<StrLen(doc_e->tag)) {
      doc_e2=MAllocIdent(doc_e,doc->mem_task);
      doc_e2->tag=StrNew(doc_e->tag+i,doc->mem_task);
      doc_e2->de_flags=doc_e->de_flags&~DOCEG_HAS_ALLOC|DOCEF_TAG;
      QueIns(doc_e2,doc_e);
      if (doc->cur_entry==doc_e && doc->cur_col>=i) {
	doc->cur_entry=doc_e2;
	doc->cur_col=doc->cur_col-i;
      }
      doc_e->tag[i]=0;
      ptr=StrNew(doc_e->tag,doc->mem_task);
      Free(doc_e->tag);
      doc_e->tag=ptr;
    }
  } else
    doc_e=doc_e->last;
  doc_e2=DocEntryNewBase(doc,type_u8|doc_e->type & 0xFFFFFF00,
	doc_e->de_flags&~DOCEG_HAS_ARG,x,y,doc_e->page_line_num);
  MemCpy(&doc_e2->settings,&doc_e->settings,sizeof(CDocSettings));
  QueIns(doc_e2,doc_e);
  return doc_e2;
}

CDocEntry *DocWordWrapAdd(CDoc *doc,CDocEntry *doc_e,
	I64 *_k,I64 left,I64 right_margin,I64 x,I64 y)
{
  CDocEntry *doc_e2;
  I64 j,i=right_margin+1-(x+left),  //Space left on line
	ii=x+1-doc_e->settings.left_margin;
  if (IsEditableText(doc_e)) {
    if (doc->cur_entry==doc_e->next) {
      if (doc->cur_col==doc_e->next->min_col)
	i--;
    } else {
      if (doc->cur_entry==doc_e && doc->cur_col==i)
	i--;
    }
    if (*_k>i) {
      for (j=i;j>8-ii && j>=0;j--)
	if (doc_e->tag[j]==CH_SPACE || doc_e->tag[j]==CH_SHIFT_SPACE) {
	  i=j+1;
	  break;
	}
      if (0<i<*_k) {
	DocSplitTag(doc,doc_e,i,x,y,DOCT_SOFT_NEW_LINE);
	*_k=StrLen(doc_e->tag);
	return NULL;
      }
    }
    if (*_k==i)
      return NULL;
  }
  if (*_k>=i) {
    doc_e2=doc_e->last;
    if (doc_e2->type_u8!=DOCT_SOFT_NEW_LINE &&
	  doc_e2->type_u8!=DOCT_NEW_LINE &&
	  doc_e2->type_u8!=DOCT_CURSOR_MOVEMENT) {
      doc_e2=DocEntryNewBase(doc,DOCT_SOFT_NEW_LINE|doc_e->type&0xFFFFFF00,
	    DOCEF_WORD_WRAP|doc_e->de_flags&(DOCEF_HIGHLIGHT|DOCG_BL_IV_UL|
	    DOCEF_SKIP|DOCEF_FILTER_SKIP),x,y,doc_e->last->page_line_num);
      MemCpy(&doc_e2->settings,&doc_e->settings,sizeof(CDocSettings));
      QueIns(doc_e2,doc_e->last);
      return doc_e2;
    }
  }
  return NULL;
}

I64 DocTmpAttr(CDoc *doc,CDocEntry *doc_e,I64 cur_u8_attr)
{
  I64 tmp_u32_attr;
  doc_e->de_flags=doc->flags& (DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT) |
	doc_e->de_flags&~(DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT);
  tmp_u32_attr=(cur_u8_attr&0xF0)<<8|
	doc->flags&DOCG_BL_IV_UL|(doc_e->settings.shifted_x&0x1F)<<16|
	(doc_e->settings.shifted_y&0x1F)<<21;
  if (doc_e->de_flags & DOCEF_HAS_BIN && *doc_e->tag=='<')
    tmp_u32_attr.u8[1]|=DOC_COLOR_BIN;
  else
    switch (doc_e->type_u8) {
      case DOCT_SPRITE:
	if (doc_e->de_flags & DOCEF_LEFT_EXP)
	  tmp_u32_attr.u8[1]|=cur_u8_attr&15;
	else if (doc_e->de_flags & DOCEF_LINK)
	  tmp_u32_attr.u8[1]|=DOC_COLOR_LINK;
	else if (doc_e->de_flags & DOCEF_LEFT_MACRO)
	  tmp_u32_attr.u8[1]|=DOC_COLOR_MACRO;
	else if (doc_e->de_flags & (DOCEF_TREE|DOCEF_LST))
	  tmp_u32_attr.u8[1]|=DOC_COLOR_TREE;
	else
	  tmp_u32_attr.u8[1]|=DOC_COLOR_BIN;
	break;
      case DOCT_HTML_CODE:
	tmp_u32_attr.u8[1]|=DOC_COLOR_BIN;
	break;
      case DOCT_LINK:
	tmp_u32_attr.u8[1]|=DOC_COLOR_LINK;
	break;
      case DOCT_MACRO:
	tmp_u32_attr.u8[1]|=DOC_COLOR_MACRO;
	break;
      case DOCT_ANCHOR:
	tmp_u32_attr.u8[1]|=DOC_COLOR_ANCHOR;
	break;
      case DOCT_TREE:
      case DOCT_LST:
	tmp_u32_attr.u8[1]|=DOC_COLOR_TREE;
	break;
      default:
	tmp_u32_attr.u8[1]|=cur_u8_attr&15;
    }
  doc_e->type.u8[1]=tmp_u32_attr.u8[1];
  tmp_u32_attr|=doc_e->type&0xFFFF0000;
  if (doc_e==doc->cur_entry && !(doc->flags&DOCF_DONT_HIGHLIGHT_CURSOR) &&
	doc_e->type_u8!=DOCT_TEXT)
    tmp_u32_attr^=0xFF00;
  doc_e->settings.final_u32_attr=tmp_u32_attr;
  return tmp_u32_attr;
}

I64 DocCharDist(CDoc *doc,I64 x,I64 y)
{
#assert FONT_WIDTH==FONT_HEIGHT
  return (SqrI64(doc->x-x)+SqrI64(doc->y-y))*FONT_WIDTH*FONT_WIDTH;
}

U0 DocDelToNum(CDoc *doc,I64 num)
{
  CDocEntry *doc_e=doc->head.next,*doc_e2;
  while (num-->0 && doc_e!=doc) {
    doc_e2=doc_e->next;
    if (!(doc_e->de_flags & (DOCEF_HOLD|DOCEF_FILTER_SKIP))) {
      if (doc_e==doc->cur_entry) {
	doc->cur_entry=doc_e2;
	doc->cur_col=doc_e2->min_col;
      }
      DocEntryDel(doc,doc_e);
    }
    doc_e=doc_e2;
  }
}

U0 DocDelToEntry(CDoc *doc,CDocEntry *clear_entry,Bool clear_holds)
{
  CDocEntry *doc_e=doc->head.next,*doc_e2;
  while (doc_e!=doc) {
    doc_e2=doc_e->next;
    if (!(doc_e->de_flags & (DOCEF_HOLD|DOCEF_FILTER_SKIP)) || clear_holds) {
      if (doc_e==doc->cur_entry) {
	doc->cur_entry=doc_e2;
	doc->cur_col=doc_e2->min_col;
      }
      DocEntryDel(doc,doc_e);
    }
    if (doc_e==clear_entry)
      break;
    doc_e=doc_e2;
  }
}

public U8 *DocEntryLink(CDoc *doc,CDocEntry *doc_e)
{//MAlloc new str, either tag or aux_str if link.
  if (doc_e->de_flags&DOCEF_LINK) {
    if (doc_e->de_flags & DOCEF_AUX_STR)
      return StrNew(doc_e->aux_str,doc->mem_task);
    else if (doc_e->de_flags & DOCEF_TAG)
      return StrNew(doc_e->tag,doc->mem_task);
  }
  return NULL;
}
