
I64 LexGetChar(CCmpCtrl *cc)
{//Get one byte-stream character, including native one-character put-back.
  U8 *src;
  CLexFile *tmpf;
  if (cc->flags&CCF_PMT) throw('LexMode');
  if (!cc->lex_include_stk) throw('LexState');
  LexFileHostChk(cc->lex_include_stk);
  if (!Btr(&cc->flags,CCf_USE_LAST_U16)) {
lgc_start:
    if (!(src=cc->cur_buf_ptr++)) {
      cc->cur_buf_ptr=NULL;
      goto lgc_eof;
    }
    switch [cc->last_U16=*src++] {
      case 0:
lgc_eof:
	tmpf=cc->lex_include_stk;
	if (tmpf->next) {
	  tmpf=LexFilePop(cc);
	  cc->cur_buf_ptr=tmpf->buf_ptr;
	  cc->flags&=~CCF_USE_LAST_U16;
	  if (!(cc->last_U16=tmpf->last_U16))
	    goto lgc_start;
	} else {
	  if (src) cc->cur_buf_ptr=src-1;
	  cc->last_U16=TK_EOF;
	}
	break;
      case CH_CURSOR:
	goto lgc_start;
      case '\n':
	tmpf=cc->lex_include_stk;
	tmpf->line_num++;
	cmp.compiled_lines++;
	tmpf->line_start=src;
	break;
      case 0xFF:
	break;
    }
    if (cc->last_U16==CH_SHIFT_SPACE) cc->last_U16=CH_SPACE;
    if (cc->opts&OPTF_ECHO && cc->last_U16<256 &&
	Bt(char_bmp_printable,cc->last_U16))
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
  if (cc->flags&CCF_PMT) throw('LexMode');
  LexFileHostChk(cc->lex_include_stk);
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
