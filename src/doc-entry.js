//Native entry/bin lifetimes and insertion; no DolDoc parser or defaults.
export const DOC_ENTRY_TYPES_SRC=String.raw`
#define DOCT_TEXT		0
#define DOCT_NEW_LINE		1
#define DOCT_SOFT_NEW_LINE	2
#define DOCT_TAB		3
#define DOCT_PAGE_BREAK		4
#define DOCT_CURSOR		5
#define DOCT_MARKER		6
#define DOCT_PMT		7
#define DOCT_CLEAR		8
#define DOCT_PAGE_LEN		9
#define DOCT_LEFT_MARGIN	10
#define DOCT_RIGHT_MARGIN	11
#define DOCT_HEADER		12
#define DOCT_FOOTER		13
#define DOCT_INDENT		14
#define DOCT_FOREGROUND		15
#define DOCT_BACKGROUND		16
#define DOCT_DFT_FOREGROUND	17
#define DOCT_DFT_BACKGROUND	18
#define DOCT_WORD_WRAP		19
#define DOCT_HIGHLIGHT		20
#define DOCT_BLINK		21
#define DOCT_INVERT		22
#define DOCT_UNDERLINE		23
#define DOCT_SHIFTED_X		24
#define DOCT_SHIFTED_Y		25
#define DOCT_CURSOR_MOVEMENT	26
#define DOCT_ANCHOR		27
#define DOCT_LINK		28
#define DOCT_BTTN		29
#define DOCT_DATA		30
#define DOCT_CHECK_BOX		31
#define DOCT_LST		32
#define DOCT_MACRO		33
#define DOCT_MENU_VAL		34
#define DOCT_HEX_ED		35
#define DOCT_TREE		36
#define DOCT_SPRITE		37
#define DOCT_INS_BIN		38
#define DOCT_INS_BIN_SIZE	39
#define DOCT_SONG		40
#define DOCT_HTML_CODE		41
#define DOCT_ERROR		42

#define DOCT_TYPES_NUM		43

//CDocEntry.de_flags.  These first 16 are arg=
#define DOCEF_TAG		1
#define DOCEF_LEN		2
#define DOCEF_AUX_STR		4
#define DOCEF_DEFINE		8
#define DOCEF_HTML_LINK		0x10
#define DOCEF_LEFT_EXP		0x20
#define DOCEF_LEFT_MACRO	0x40
#define DOCEF_RIGHT_EXP		0x80
#define DOCEF_RIGHT_MACRO	0x100
#define DOCEF_HAS_BIN		0x200
#define DOCEF_BIN_PTR_LINK	0x400
#define DOCEF_RAW_TYPE		0x800
#define DOCEF_SHIFTED_X		0x1000
#define DOCEF_SHIFTED_Y		0x2000
#define DOCEF_SCROLLING_X	0x4000
#define DOCEF_USER_DATA		0x8000

//CDocEntry.de_flags.  These are +/- flags
#define DOCEF_LEFT_CB		0x10000
#define DOCEF_LEFT_IN_STR	0x20000
#define DOCEF_RIGHT_CB		0x40000
#define DOCEF_RIGHT_IN_STR	0x80000
#define DOCEF_LEFT_X		0x100000
#define DOCEF_CENTER_X		0x200000
#define DOCEF_RIGHT_X		0x400000
#define DOCEF_TOP_Y		0x800000
#define DOCEF_CENTER_Y		0x1000000
#define DOCEF_BOTTOM_Y		0x2000000
//HL...UL
#define DOCEF_TAG_CB		0x100000000
#define DOCEF_PAGE_REL_Y	0x200000000
#define DOCEF_MARGIN_REL_X	0x400000000
#define DOCEF_WIN_REL		0x800000000
#define DOCEF_LINK		0x1000000000
#define DOCEF_ESC		0x2000000000 //Send <ESC> (Exit and Save)
#define DOCEF_QUIT		0x4000000000 //Send <SHIFT-ESC> (Abort)
#define DOCEF_FROM_START	0x8000000000
#define DOCEF_HAS_BORDER	0x10000000000
#define DOCEF_SOLID_BORDER	0x20000000000
#define DOCEF_BORDER_PLOT	0x40000000000
#define DOCEF_CHECKED_COLLAPSED 0x80000000000 //Checked or Collapsed
#define DOCEF_CHECK_COLLAPSABLE 0x100000000000
#define DOCEF_REFRESH_DATA	0x200000000000
#define DOCEF_UPDATE_DATA	0x400000000000
//$LK,"DOCEF_DEREF_DATA",A="MN:DOCEF_DEREF_DATA"$ is confusing. $LK,"DocForm",A="MN:DocForm"$() makes doc_e->data point to members
//of class. For ints, it derefs doc_e->data as a ptr.  For strings, it doesn't.
#define DOCEF_DEREF_DATA	0x800000000000
#define DOCEF_REMALLOC_DATA	0x1000000000000
#define DOCEF_HAS_TERMINATOR	0x2000000000000
#define DOCEF_ZERO_BASED	0x4000000000000
#define DOCEF_HOLD		0x8000000000000
#define DOCEF_TREE		0x10000000000000
#define DOCEF_LST		0x20000000000000
#define DOCEF_SKIP		0x40000000000000
#define DOCEF_POPUP		0x80000000000000
#define DOCEF_SKIP_IN_FORM	0x100000000000000
#define DOCEF_FILTER_SKIP	0x200000000000000
#define DOCEF_NO_CLICK_ON	0x400000000000000
#define DOCEF_DONT_DRAW		0x800000000000000 //only works on sprites
#define DOCEF_DFT_LEN		0x1000000000000000
#define DOCEF_DFT_RAW_TYPE	0x2000000000000000

#define DOCEG_HAS_ALLOC		(DOCEF_TAG|DOCEF_AUX_STR|DOCEF_DEFINE|\
  DOCEF_HTML_LINK|DOCEF_LEFT_MACRO|DOCEF_RIGHT_MACRO|DOCEF_BIN_PTR_LINK|\
  DOCEF_REMALLOC_DATA)

#define DOCEG_HAS_ARG		((DOCEG_HAS_ALLOC&~DOCEF_REMALLOC_DATA)|\
  DOCEF_LEN|DOCEF_LEFT_EXP|DOCEF_RIGHT_EXP|DOCEF_HAS_BIN|DOCEF_RAW_TYPE|\
  DOCEF_SHIFTED_X|DOCEF_SHIFTED_Y|DOCEF_SCROLLING_X|DOCEF_USER_DATA)

#define DOCEG_DONT_EDIT	(DOCEF_DEFINE|DOCEF_HTML_LINK|\
  DOCEF_AUX_STR|DOCEF_BIN_PTR_LINK|DOCEF_SCROLLING_X|DOCEF_TAG_CB)

`;

export const DOC_ENTRY_SRC=String.raw`
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
`;
