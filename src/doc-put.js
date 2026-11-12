//Native finite document output with unpublished-entry ownership.
export const DOC_PUT_SRC=String.raw`
#define DOCF_DBL_DOLLARS 0x20
#define DOCf_DBL_DOLLARS 5

U32 char_bmp_zero_cr_nl_cursor[16]=
      {0x2421,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},
    char_bmp_zero_tab_cr_nl_cursor[16]=
      {0x2621,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},
    char_bmp_zero_tab_cr_nl_cursor_dollar[16]=
      {0x2621,0x10,0,0,0,0,0,0,0,0,0,0,0,0,0,0};

CDocEntry *DocOutText(CDoc *doc,U8 *src,I64 len,I64 filter=0)
{//Allocate a terminated tag without changing the caller's delimiters.
  CDocEntry *entry=DocEntryNewBase(doc,
	DOCT_TEXT|doc->settings_head.dft_text_attr<<8);
  U8 *st=NULL,*ptr,*dst;
  try {
    if (filter) {
      st=MAlloc(len+1);
      MemCpy(st,src,len);st[len]=0;
      if (filter==2)
	StrUtil(st,SUF_REM_CTRL_CHARS);
      else {
	ptr=dst=st;
	while (*ptr)
	  if (*ptr!=CH_CURSOR) *dst++=*ptr++;
	  else ptr++;
	*dst=0;
      }
      src=st;len=StrLen(src);
    }
    entry->tag=MAlloc(len+1,doc->mem_task);
    MemCpy(entry->tag,src,len);entry->tag[len]=0;
    entry->max_col=len;
  } catch {
    Free(st);Free(entry->tag);Free(entry);
  }
  Free(st);
  return entry;
}

CDocEntry *DocPutS(CDoc *doc,U8 *st)
{//Insert complete commands; partial dollar-command input is not retained.
  U8 *ptr=st,*start,*src,*dst,*buf=NULL,*char_bmp;
  Bool unlock,marker;
  I64 ch,len,filter,type;
  CDocEntry head,*entry=NULL,*res=NULL;
  if (!st || !doc && !(doc=DocPut) || doc->doc_signature!=DOC_SIGNATURE_VAL)
    return NULL;
  marker=Bt(&doc->flags,DOCf_BREAK_UNLOCKED);
  unlock=DocLock(doc);
  QueInit(&head);
  try {
    if (doc->flags&DOCF_PLAIN_TEXT_TABS)
      char_bmp=char_bmp_zero_cr_nl_cursor;
    else if (doc->flags&DOCF_PLAIN_TEXT)
      char_bmp=char_bmp_zero_tab_cr_nl_cursor;
    else
      char_bmp=char_bmp_zero_tab_cr_nl_cursor_dollar;
    while (*ptr) {
      start=ptr;
      do ch=*ptr++;
      while (!Bt(char_bmp,ch) || ch==CH_CURSOR && doc->flags&DOCF_NO_CURSOR);
      ptr--;
      if (len=ptr-start) {
	filter=0;
	if (doc->flags&DOCF_NO_CURSOR) {
	  filter=1;
	  if (!ch) filter=2;
	}
	entry=DocOutText(doc,start,len,filter);
	QueIns(entry,head.last);entry=NULL;
      }
      if (ch)
	switch (ch) {
	  case CH_CURSOR:
	  case '\t':
	    type=DOCT_CURSOR;
	    if (ch=='\t') type=DOCT_TAB;
	    entry=DocEntryNewBase(doc,
		  type|doc->settings_head.dft_text_attr<<8);
	    QueIns(entry,head.last);entry=NULL;
	    ptr++;
	    break;
	  case '$$':
	    start=++ptr;
	    while (*ptr && *ptr!='$$') ptr++;
	    if (*ptr) {
	      if (ptr-1==start && *start==CH_CURSOR) {
		entry=DocEntryNewBase(doc,
		      DOCT_CURSOR|doc->settings_head.dft_text_attr<<8);
		QueIns(entry,head.last);entry=NULL;
		start++;
	      }
	      if (ptr==start) {
		len=1;
		if (doc->flags&DOCF_DBL_DOLLARS) len=2;
		entry=DocOutText(doc,"$$$$",len);
		entry->max_col=1;
		QueIns(entry,head.last);entry=NULL;
	      } else {
		buf=MAlloc(ptr-start+1);
		src=start;dst=buf;
		while (src!=ptr) {
		  ch=*src++;
		  if (ch==CH_CURSOR) {
		    entry=DocEntryNewBase(doc,
			  DOCT_CURSOR|doc->settings_head.dft_text_attr<<8);
		    QueIns(entry,head.last);entry=NULL;
		  } else *dst++=ch;
		}
		*dst=0;
		if (entry=PrsDollarCmd(doc,buf)) {
		  res=entry;
		  QueIns(entry,head.last);entry=NULL;
		}
		Free(buf);buf=NULL;
	      }
	      ptr++;
	    }
	    break;
	  default:
	    entry=DocEntryNewBase(doc,
		  DOCT_NEW_LINE|doc->settings_head.dft_text_attr<<8);
	    QueIns(entry,head.last);entry=NULL;
	    if (ch=='\r') while (*ptr=='\r') ptr++;
	    if (*ptr=='\n') ptr++;
	    while (*ptr=='\r') ptr++;
	}
    }
    while (head.next!=&head) {
      entry=head.next;
      QueRem(entry);
      try DocInsEntry(doc,entry);
      catch QueIns(entry,head.last);
      entry=NULL;
    }
  } catch {
    Free(buf);
    while (head.next!=&head) DocEntryDel(doc,head.next);
    if (unlock) DocHostRecalcUnlock(doc,marker);
  }
  if (unlock) DocUnlock(doc);
  return res;
}

public CDocEntry *DocPrint(CDoc *doc=NULL,U8 *fmt,...)
{//Format complete commands and return the last new dollar-command entry.
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  CDocEntry *res;
  try res=DocPutS(doc,buf);
  catch Free(buf);
  Free(buf);
  return res;
}
`;
