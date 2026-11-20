
U32 lex_zeros=0;

Bool LexDollar(CCmpCtrl *cc,CDoc *doc,CDocEntry *doc_e)
{
  U8 *st;
  if (cc->flags&CCF_IN_QUOTES) {
    Free(cc->dollar_buf);
    st=Doc2PlainText(doc,doc_e);
    cc->dollar_buf=MStrPrint("$$%$$Q$$",st);
    cc->dollar_cnt=2;
    Free(st);
    return TRUE;
  } else
    return FALSE;
}

extern U8 *CmdLinePmt(); //V5.03 Compiler/CExts.HC.

I64 LexGetChar(CCmpCtrl *cc)
{//Get one char from stream. Allow put-back one.
  U8 *ptr,*src;
  CLexFile *tmpf;
  CDoc *doc;
  CDocEntry *doc_e;
  if (!cc->lex_include_stk) throw('LexState');
  if (!Btr(&cc->flags,CCf_USE_LAST_U16)) {
lgc_start1:
    if (!(src=cc->cur_buf_ptr++)) {
      cc->cur_buf_ptr=NULL;
      goto lgc_here;
    }
    switch [cc->last_U16=*src++] {
      case 0:
lgc_here:
	tmpf=cc->lex_include_stk;
	if (tmpf->flags & LFSF_DOC) {
	  doc=tmpf->doc;
	  doc_e=tmpf->cur_entry;
	  doc_e=doc_e->next;
lgc_start2:
	  if (doc_e!=doc) {
	    tmpf->cur_entry=doc_e;
	    switch [doc_e->type_u8] {
	      case DOCT_TEXT:
		if (doc_e->de_flags & ~(DOCEF_TAG|DOCEF_DEFINE|DOCEF_TAG_CB|
		      DOCG_BL_IV_UL|DOCEF_WORD_WRAP|DOCEF_HIGHLIGHT|
		      DOCEF_SKIP|DOCEF_FILTER_SKIP) &&
		      LexDollar(cc,doc,doc_e) && *(src=cc->dollar_buf)) {
		  tmpf->line_num=doc_e->y+1;
		  tmpf->buf_ptr=cc->cur_buf_ptr=src;
		} else if (*(src=doc_e->tag))
		  tmpf->buf_ptr=cc->cur_buf_ptr=src;
		else {
		  doc_e=doc_e->next;
		  goto lgc_start2;
		}
		break;
	      case DOCT_NEW_LINE:
		tmpf->buf_ptr=cc->cur_buf_ptr=&lex_zeros;
		tmpf->line_start=doc_e->next;
		tmpf->line_num=doc_e->y+2;//+1 because NEW_LINE is on prev line
//+1 because doc y starts at zero
		cmp.compiled_lines++;
		cc->last_U16='\n';
		goto lgc_done;
	      case DOCT_TAB:
		tmpf->buf_ptr=cc->cur_buf_ptr=&lex_zeros;
		tmpf->line_num=doc_e->y+1;
		cc->last_U16='\t';
		goto lgc_done;
	      case DOCT_INS_BIN:
		tmpf->buf_ptr=cc->cur_buf_ptr=&lex_zeros;
		tmpf->line_num=doc_e->y+1;
		Free(cc->cur_str);
		cc->cur_str=NULL;
		cc->cur_str_len=0;
		if (doc_e->bin_data) {
		  ptr=MAlloc(doc_e->bin_data->size);
		  if (doc_e->bin_data->data)
		    MemCpy(ptr,doc_e->bin_data->data,doc_e->bin_data->size);
		  cc->cur_str=ptr;
		  cc->cur_str_len=doc_e->bin_data->size;
		}
		cc->last_U16=TK_INS_BIN;
		goto lgc_done;
	      case DOCT_INS_BIN_SIZE:
		tmpf->buf_ptr=cc->cur_buf_ptr=&lex_zeros;
		if (doc_e->bin_data)
		  cc->cur_i64=doc_e->bin_data->size;
		else
		  cc->cur_i64=0;
		tmpf->line_num=doc_e->y+1;
		cc->last_U16=TK_INS_BIN_SIZE;
		goto lgc_done;
	      case DOCT_SHIFTED_Y:
		if (LexDollar(cc,doc,doc_e) && *(src=cc->dollar_buf)) {
		  tmpf->line_num=doc_e->y+1;
		  tmpf->buf_ptr=cc->cur_buf_ptr=src;
		} else {
		  tmpf->buf_ptr=cc->cur_buf_ptr=&lex_zeros;
		  tmpf->line_num=doc_e->y+1;
		  if (doc_e->attr<0)
		    cc->last_U16=TK_SUPERSCRIPT;
		  else if (doc_e->attr>0)
		    cc->last_U16=TK_SUBSCRIPT;
		  else
		    cc->last_U16=TK_NORMALSCRIPT;
		  goto lgc_done;
		}
		break;
	      case DOCT_MARKER:
	      case DOCT_CURSOR:
		doc_e=doc_e->next;
		goto lgc_start2;
	      case 0xFF: //nobound switch
	      default:
		if (LexDollar(cc,doc,doc_e) && *(src=cc->dollar_buf)) {
		  tmpf->line_num=doc_e->y+1;
		  tmpf->buf_ptr=cc->cur_buf_ptr=src;
		} else {
		  doc_e=doc_e->next;
		  goto lgc_start2;
		}
	    }
	  }
	  if (doc_e!=doc)
	    goto lgc_start1;
	  tmpf->cur_entry=doc->head.last; //When take next, will still be end.
	}
	tmpf=cc->lex_include_stk;
	if (tmpf->next) {
	  tmpf=LexFilePop(cc);
	  cc->cur_buf_ptr=tmpf->buf_ptr;
	  cc->flags&=~CCF_USE_LAST_U16;
	  if (!(cc->last_U16=tmpf->last_U16))
	    goto lgc_start1;
	} else {
	  if (cc->flags & CCF_PMT) {
	    Free(tmpf->buf);
	    ptr=CmdLinePmt;
	    if (StrCmp(ptr,"\n") && !cc->pmt_line++ && !StrCmp(ptr,"?\n") &&
		cc->flags & CCF_QUESTION_HELP) {
	      Free(ptr);
	      ptr=StrNew("Help;;\n");
	    }
	    tmpf->buf=tmpf->buf_ptr=tmpf->line_start=cc->cur_buf_ptr=ptr;
	    goto lgc_start1;
	  } else {
	    if (src)
	      cc->cur_buf_ptr=src-1;
	    cc->last_U16=TK_EOF;
	  }
	}
	break;
      case CH_CURSOR:
	goto lgc_start1;
      case '\n':
	tmpf=cc->lex_include_stk;
	if (!(tmpf->flags & LFSF_DOC)) {
	  tmpf->line_num++;
	  cmp.compiled_lines++;
	  tmpf->line_start=src;
	}
	break;
      case 0xFF: //nobound switch
    }
lgc_done:
    if (cc->last_U16==CH_SHIFT_SPACE)
      cc->last_U16=CH_SPACE;
    if (cc->opts & OPTF_ECHO &&
	  cc->last_U16<256 && Bt(char_bmp_printable,cc->last_U16))
      '' cc->last_U16;
  }
  return cc->last_U16;
}

U0 LexSkipEol(CCmpCtrl *cc)
{//Read through the next native end-of-line byte.
  I64 ch;
  do ch=LexGetChar(cc);
  while (Bt(char_bmp_non_eol,ch));
}

U0 LexIncludeStr(CCmpCtrl *cc,U8 *abs_filename,U8 *src,Bool actual_file)
{//Adopt a nested byte stream only after its record and name are allocated.
  CLexFile *tmpf=NULL;
  try {
    tmpf=CAlloc(sizeof(CLexFile));
    if (actual_file) tmpf->full_name=StrNew(abs_filename);
    else tmpf->full_name=StrNew(blkdev.tmp_filename);
  } catch {
    if (tmpf) {
      Free(tmpf->full_name);
      Free(tmpf);
    }
  }
  LexBackupLastChar(cc);
  tmpf->next=cc->lex_include_stk;
  tmpf->depth=tmpf->next->depth+1;
  cc->lex_include_stk=tmpf;
  tmpf->line_num=1;
  tmpf->buf=tmpf->buf_ptr=tmpf->line_start=cc->cur_buf_ptr=src;
}

CDoc *LexDocRead(U8 *abs_filename,I64 flags)
{
  CDoc *doc=DocNew(abs_filename);
  U8 *src;
  I64 size=0;
  doc->flags|=flags;
  src=FileRead(abs_filename,&size);
  if (!src || !size) {
    Free(src);
    src=CAlloc(1);
    size=0;
  }
  DocLoad(doc,src,size);
  Free(src);
  return doc;
}

I64 cmp_type_flags_src_code[(DOCT_TYPES_NUM+63)/64]={
  1<<DOCT_TEXT|1<<DOCT_TAB|1<<DOCT_INS_BIN|1<<DOCT_INS_BIN_SIZE};

U0 LexAttachDoc(CCmpCtrl *cc,CLexFile *tmpf=NULL,
	CDoc *doc=NULL,U8 *abs_filename=NULL,CDocEntry *doc_e=NULL,I64 col=0)
{//Start lexing doc. Give either doc or abs_filename.
  if (!doc)
    doc=LexDocRead(abs_filename,DOCF_DBL_DOLLARS);
  if (!tmpf) {
    LexBackupLastChar(cc);
    tmpf=LexFilePush(cc);
  }
  if (!doc_e)
    doc_e=doc->head.next;
  tmpf->full_name=StrNew(doc->filename.name);
  tmpf->doc=doc;
  while (doc_e!=doc) {
    if (Bt(cmp_type_flags_src_code,doc_e->type_u8))
      break;
    doc_e=doc_e->next;
    col=doc_e->min_col;
  }
  if (doc_e!=doc) {
    col=ClampI64(col,doc_e->min_col,doc_e->max_col);
    tmpf->line_start=doc_e;
    tmpf->buf=NULL;
    tmpf->line_num=doc_e->y+1;
    if (doc_e->type_u8==DOCT_TEXT) {
      tmpf->cur_entry=doc_e;
      tmpf->buf_ptr=doc_e->tag;
    } else {
      tmpf->cur_entry=doc_e->last; //TODO: might be problem at begin of file
      tmpf->buf_ptr=&lex_zeros;
    }
    tmpf->flags=LFSF_DOC;
  } else {//TODO: DocDel(doc)?
    col=0;
    tmpf->buf=tmpf->buf_ptr=tmpf->line_start=CAlloc(1);
    tmpf->line_num=1;
    tmpf->flags=0;
  }
  cc->cur_buf_ptr=tmpf->buf_ptr+col;
  tmpf->last_U16=0;
}
