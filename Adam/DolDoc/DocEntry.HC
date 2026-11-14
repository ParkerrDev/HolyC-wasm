
CDocBin *DocBinFindNum(CDoc *haystack_doc,I64 needle_num)
{
  CDocBin *b=haystack_doc->bin_head.next;
  while (b!=&haystack_doc->bin_head) {
    if (b->num==needle_num)
      return b;
    b=b->next;
  }
  return NULL;
}

CDocBin *DocBinFindTag(CDoc *haystack_doc,U8 *needle_tag)
{
  CDocBin *b;
  if (needle_tag) {
    b=haystack_doc->bin_head.next;
    while (b!=&haystack_doc->bin_head) {
      if (b->tag && !StrCmp(b->tag,needle_tag))
	return b;
      b=b->next;
    }
  }
  return NULL;
}

U0 DocBinDel(CDoc *doc,CDocBin *b)
{
  if (doc && b && b->use_cnt) {
    b->use_cnt--;
    if (!b->use_cnt) {
      QueRem(b);
      Free(b->tag);
      Free(b->data);
      Free(b);
    }
  } else
    RawPrint(3000,"DocBinDel");
}

Bool IsEditableText(CDocEntry *doc_e)
{
  if (doc_e->type_u8==DOCT_TEXT && !(doc_e->de_flags&DOCEG_DONT_EDIT))
    return TRUE;
  else
    return FALSE;
}

public U0 DocEntryDel(CDoc *doc,CDocEntry *doc_e)
{//Free entry and all parts of entry.
  if (!doc || doc==doc_e)
    RawPrint(3000,"DocEntryDel");
  else {
    if (doc->cur_entry==doc_e)
      doc->cur_entry=doc_e->next;
    QueRem(doc_e);
    if (doc_e->de_flags & DOCEF_TAG)
      Free(doc_e->tag);
    if (doc_e->de_flags & DOCEF_AUX_STR)
      Free(doc_e->aux_str);
    if (doc_e->de_flags & DOCEF_DEFINE)
      Free(doc_e->define_str);
    if (doc_e->de_flags & DOCEF_HTML_LINK)
      Free(doc_e->html_link);
    if (doc_e->de_flags & DOCEF_LEFT_MACRO)
      Free(doc_e->left_macro);
    if (doc_e->de_flags & DOCEF_RIGHT_MACRO)
      Free(doc_e->right_macro);
    if (doc_e->de_flags & DOCEF_BIN_PTR_LINK)
      Free(doc_e->bin_ptr_link);
    if (doc_e->de_flags & DOCEF_HAS_BIN)
      DocBinDel(doc,doc_e->bin_data);
    if (doc_e->de_flags & DOCEF_REMALLOC_DATA)
      Free(doc_e->data);
    Free(doc_e);
  }
}

public I64 DocEntrySize(CDoc *,CDocEntry *doc_e)
{//Mem size of entry and all parts.
  I64 res;
  if (!doc_e) return 0;
  res=MSize2(doc_e);
  if (doc_e->de_flags & DOCEF_TAG)
    res+=MSize2(doc_e->tag);
  if (doc_e->de_flags & DOCEF_AUX_STR)
    res+=MSize2(doc_e->aux_str);
  if (doc_e->de_flags & DOCEF_DEFINE)
    res+=MSize2(doc_e->define_str);
  if (doc_e->de_flags & DOCEF_HTML_LINK)
    res+=MSize2(doc_e->html_link);
  if (doc_e->de_flags & DOCEF_LEFT_MACRO)
    res+=MSize2(doc_e->left_macro);
  if (doc_e->de_flags & DOCEF_RIGHT_MACRO)
    res+=MSize2(doc_e->right_macro);
  if (doc_e->de_flags & DOCEF_BIN_PTR_LINK)
    res+=MSize2(doc_e->bin_ptr_link);
  if (doc_e->de_flags & DOCEF_REMALLOC_DATA)
    res+=MSize2(doc_e->data);
  return res;
}

U0 DocUndoDel(CDoc *,CDocUndo *u)
{
  Free(u->body);
  Free(u);
}

public CDocEntry *DocEntryCopy(CDoc *doc,CDocEntry *doc_e)
{//Make copy of entry and all parts of entry.
  CDocEntry *doc_ne=NULL;
  CDocBin *tmpb=NULL;
  CTask *task=doc->mem_task;
  try {
    doc_ne=MAllocIdent(doc_e,task);
    doc_ne->next=doc_ne;
    doc_ne->last=doc_ne;
    doc_ne->de_flags&=~(DOCEG_HAS_ALLOC|DOCEF_HAS_BIN);
    if (doc_e->de_flags & DOCEF_TAG) {
      doc_ne->tag=MAllocIdent(doc_e->tag,task);
      doc_ne->de_flags|=DOCEF_TAG;
    }
    if (doc_e->de_flags & DOCEF_AUX_STR) {
      doc_ne->aux_str=MAllocIdent(doc_e->aux_str,task);
      doc_ne->de_flags|=DOCEF_AUX_STR;
    }
    if (doc_e->de_flags & DOCEF_DEFINE) {
      doc_ne->define_str=MAllocIdent(doc_e->define_str,task);
      doc_ne->de_flags|=DOCEF_DEFINE;
    }
    if (doc_e->de_flags & DOCEF_HTML_LINK) {
      doc_ne->html_link=MAllocIdent(doc_e->html_link,task);
      doc_ne->de_flags|=DOCEF_HTML_LINK;
    }
    if (doc_e->de_flags & DOCEF_LEFT_MACRO) {
      doc_ne->left_macro=MAllocIdent(doc_e->left_macro,task);
      doc_ne->de_flags|=DOCEF_LEFT_MACRO;
    }
    if (doc_e->de_flags & DOCEF_RIGHT_MACRO) {
      doc_ne->right_macro=MAllocIdent(doc_e->right_macro,task);
      doc_ne->de_flags|=DOCEF_RIGHT_MACRO;
    }
    if (doc_e->de_flags & DOCEF_BIN_PTR_LINK) {
      doc_ne->bin_ptr_link=MAllocIdent(doc_e->bin_ptr_link,task);
      doc_ne->de_flags|=DOCEF_BIN_PTR_LINK;
    }
    if (doc_e->de_flags & DOCEF_HAS_BIN) {
      tmpb=MAllocIdent(doc_e->bin_data,task);
      tmpb->data=tmpb->tag=NULL;
      tmpb->data=MAllocIdent(doc_e->bin_data->data,task);
      if (doc_e->de_flags&DOCEF_TAG && doc_e->tag && *doc_e->tag)
	tmpb->tag=StrNew(doc_e->tag,task);
    }
    if (doc_e->de_flags & DOCEF_REMALLOC_DATA) {
      doc_ne->data=MAllocIdent(doc_e->data,task);
      doc_ne->de_flags|=DOCEF_REMALLOC_DATA;
    }
  } catch {
    if (tmpb) {
      Free(tmpb->tag);
      Free(tmpb->data);
      Free(tmpb);
    }
    if (doc_ne)
      DocEntryDel(doc,doc_ne);
  }
  if (tmpb) {
    doc_ne->bin_num=doc->cur_bin_num;
    tmpb->num=doc->cur_bin_num++;
    doc_ne->bin_data=tmpb;
    doc_ne->de_flags|=DOCEF_HAS_BIN;
    QueIns(tmpb,doc->bin_head.last);
  }
  return doc_ne;
}

CDocEntry *DocEntryNewTag(CDoc *doc,CDocEntry *doc_ce,U8 *tag)
{//Copy the text entry's settings; type defaults are overridden by its flags.
  I64 l=StrLen(tag);
  CDocEntry *res=CAlloc(sizeof(CDocEntryBase),doc->mem_task);
  try {
    res->tag=MAlloc(l+1,doc->mem_task);
    MemCpy(res->tag,tag,l+1);
  } catch
    Free(res);
  res->type=doc_ce->type;
  res->de_flags=doc_ce->de_flags;
  res->x=doc_ce->x;
  res->y=doc_ce->y;
  res->page_line_num=doc_ce->page_line_num;
  res->max_col=l;
  MemCpy(&res->settings,&doc_ce->settings,sizeof(CDocSettings));
  return res;
}

U0 DocRemSoftNewLines(CDoc *doc=NULL,CDocEntry *doc_e=NULL)
{
  CDocEntry *doc_e2,*saved_ll=doc_e;
  Bool unlock;
  if (!doc && !(doc=DocPut))
    return;
  unlock=DocLock(doc);
  if (!doc_e)
    doc_e=doc->head.next;
  while (doc_e!=doc) {
    doc_e2=doc_e->next;
    if (doc_e->type_u8==DOCT_SOFT_NEW_LINE) {
      if (doc->cur_entry==doc_e) {
	doc->cur_entry=doc_e2;
	doc->cur_col=doc->cur_entry->min_col;
      }
      DocEntryDel(doc,doc_e);
    } else if (saved_ll && doc_e->type_u8==DOCT_NEW_LINE)
      break;
    doc_e=doc_e2;
  }
  if (unlock)
    DocUnlock(doc);
}

public U0 DocInsEntry(CDoc *doc,CDocEntry *doc_e)
{//Insert an entry, splitting text and removing stale soft line breaks.
  U8 *dst;
  Bool unlock=DocLock(doc);
  CDocEntry *doc_ce=doc->cur_entry,*doc_ne=NULL;
  try {
    if (doc->cur_col>0 && doc_ce->type_u8==DOCT_TEXT &&
	  !(doc_ce->de_flags&(DOCEF_TAG_CB|DOCEF_DEFINE|DOCEF_AUX_STR|
	  DOCEF_HTML_LINK|DOCEF_BIN_PTR_LINK)) &&
	  doc->cur_col<doc_ce->max_col)
      doc_ne=DocEntryNewTag(doc,doc_ce,doc_ce->tag+doc->cur_col);
    doc_e->x=doc_ce->x;
    doc_e->y=doc_ce->y;
    doc_e->page_line_num=doc_ce->page_line_num;
    MemCpy(&doc_e->settings,&doc_ce->settings,sizeof(CDocSettings));
    if (doc_ne) {
      dst=doc_ce->tag+doc->cur_col;
      *dst=0;
      doc_ne->type=DOCT_TEXT|doc_ce->type&0xFFFFFF00;
      doc_ce->max_col=doc->cur_col;
      QueIns(doc_ne,doc_ce);
      doc->cur_col=0;
      doc_ce=doc_ne;
    }
    if (doc_ce->type_u8==DOCT_TEXT && doc->cur_col>=doc_ce->max_col) {
      QueIns(doc_e,doc_ce);
      doc->cur_entry=doc_e->next;
    } else {
      QueIns(doc_e,doc_ce->last);
      doc->cur_entry=doc_ce;
    }
    doc->cur_col=doc->cur_entry->min_col;
    DocRemSoftNewLines(doc,doc->cur_entry);
  } catch {
    if (unlock)
      DocUnlock(doc);
  }
  if (unlock)
    DocUnlock(doc);
}
