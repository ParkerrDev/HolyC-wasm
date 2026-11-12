CDocEntry *DocPutS(CDoc *doc,U8 *st)
{//Don't use this.  Use $LK-UL,"DocPrint",A="MN:DocPrint"$().
//Does not handle partial Doc entries.
  //Returns last newly created dollar-sign CDocEntry or NULL.
  U8 *ptr=st,*ptr2,*st2,*ptr3,*ptr4,*src,
	*char_bmp;
  Bool unlock;
  I64 ch,j;
  CDocEntry *doc_e=NULL,*res=NULL,*doc_ce;
  if (!st || !doc && !(doc=DocPut) || doc->doc_signature!=DOC_SIGNATURE_VAL)
    return NULL;
  unlock=DocLock(doc);
  if (doc->flags & DOCF_PLAIN_TEXT_TABS)
    char_bmp=char_bmp_zero_cr_nl_cursor;
  else if (doc->flags & DOCF_PLAIN_TEXT)
    char_bmp=char_bmp_zero_tab_cr_nl_cursor;
  else
    char_bmp=char_bmp_zero_tab_cr_nl_cursor_dollar;
  doc_ce=doc->cur_entry;
  while (*ptr) {
    ptr2=ptr;
    do ch=*ptr++;
    while (!Bt(char_bmp,ch) || ch==CH_CURSOR && doc->flags&DOCF_NO_CURSOR);
    ptr--;
    if (!ch) {
      if (j=ptr-ptr2) {
	doc_e=DocEntryNewBase(doc,
	      DOCT_TEXT|doc->settings_head.dft_text_attr<<8);
	if (doc->flags & DOCF_NO_CURSOR) {
	  src=MAlloc(j+1);
	  MemCpy(src,ptr2,j+1);
	  StrUtil(src,SUF_REM_CTRL_CHARS);
	  j=StrLen(src);
	} else
	  src=ptr2;
	doc_e->tag=MAlloc(j+1,doc->mem_task);
	MemCpy(doc_e->tag,src,j+1);
	doc_e->max_col=j;
	DocInsEntry(doc,doc_e);
	if (doc->flags & DOCF_NO_CURSOR)
	  Free(src);
      }
    } else {
      if (j=ptr-ptr2) {
	*ptr=0;
	doc_e=DocEntryNewBase(doc,
	      DOCT_TEXT|doc->settings_head.dft_text_attr<<8);
	if (doc->flags & DOCF_NO_CURSOR) {
	  src=MAlloc(j+1);
	  MemCpy(src,ptr2,j+1);
	  ptr3=src;
	  ptr4=src;
	  while (*ptr3)
	    if (*ptr3!=CH_CURSOR)
	      *ptr4++=*ptr3++;
	    else
	      ptr3++;
	  *ptr4=0;
	  j=ptr4-src;
	} else
	  src=ptr2;
	doc_e->tag=MAlloc(j+1,doc->mem_task);
	MemCpy(doc_e->tag,src,j+1);
	doc_e->max_col=j;
	DocInsEntry(doc,doc_e);
	if (doc->flags & DOCF_NO_CURSOR)
	  Free(src);
	*ptr=ch;
      }
      switch (ch) {
	case CH_CURSOR:
	  doc_e=DocEntryNewBase(doc,
		DOCT_CURSOR|doc->settings_head.dft_text_attr<<8);
	  DocInsEntry(doc,doc_e);
	  ptr++;
	  break;
	case '\t':
	  doc_e=DocEntryNewBase(doc,
		DOCT_TAB|doc->settings_head.dft_text_attr<<8);
	  DocInsEntry(doc,doc_e);
	  ptr++;
	  break;
	case '$$':
	  ptr++; //skip first dollar
	  ptr2=ptr;
	  while (*ptr && *ptr!='$$')
	    ptr++;
	  if (*ptr) {
	    *ptr=0; //zero second dollar
	    if (ptr-1==ptr2 && *ptr2==CH_CURSOR) {
	      doc_e=DocEntryNewBase(doc,
		    DOCT_CURSOR|doc->settings_head.dft_text_attr<<8);
	      DocInsEntry(doc,doc_e);
	      ptr2++;
	    }
	    if (ptr==ptr2) {
	      doc_e=DocEntryNewBase(doc,
		    DOCT_TEXT|doc->settings_head.dft_text_attr<<8);
	      doc_e->max_col=1;
	      if (doc->flags & DOCF_DBL_DOLLARS)
		doc_e->tag=StrNew("$$$$",doc->mem_task);
	      else
		doc_e->tag=StrNew("$$",doc->mem_task);
	      DocInsEntry(doc,doc_e);
	    } else {
	      st2=MAlloc(ptr-ptr2+1);
	      ptr3=ptr2;
	      ptr4=st2;
	      while (ch=*ptr3++) {
		if (ch==CH_CURSOR) {
		  doc_e=DocEntryNewBase(doc,
			DOCT_CURSOR|doc->settings_head.dft_text_attr<<8);
		  DocInsEntry(doc,doc_e);
		} else
		  *ptr4++=ch;
	      }
	      *ptr4=0;
	      if (doc_e=PrsDollarCmd(doc,st2)) {
		res=doc_e;
		DocInsEntry(doc,doc_e);
	      }
	      Free(st2);
	    }
	    *ptr++='$$';
	  }
	  break;
	default:
	  doc_e=DocEntryNewBase(doc,
		DOCT_NEW_LINE|doc->settings_head.dft_text_attr<<8);
	  DocInsEntry(doc,doc_e);
	  if (ch=='\r')
	    while (*ptr=='\r')
	      ptr++;
	  if (*ptr=='\n')
	    ptr++;
	  while (*ptr=='\r')
	    ptr++;
      }
    }
  }
  if (unlock)
    DocUnlock(doc);
  return res;
}

public CDocEntry *DocPrint(CDoc *doc=NULL,U8 *fmt,...)
{//You must not print partial doc cmds.
//Returns last newly created dollar-sign CDocEntry or NULL.
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  CDocEntry *res=DocPutS(doc,buf);
  Free(buf);
  return res;
}

