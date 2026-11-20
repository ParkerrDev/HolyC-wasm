
U0 LexFileHostChk(CLexFile *tmpf)
{//Document streams need actual DolDoc lifetime support.
  while (tmpf) {
    if (tmpf->flags&LFSF_DOC) throw('LexMode');
    tmpf=tmpf->next;
  }
}

CLexFile *LexFilePush(CCmpCtrl *cc)
{//#include file push.
  CLexFile *res=CAlloc(sizeof(CLexFile));
  if (res->next=cc->lex_include_stk)
    res->depth=res->next->depth+1;
  else
    res->depth=-1;
  return cc->lex_include_stk=res;
}

CLexFile *LexFilePop(CCmpCtrl *cc)
{//#include file pop; outer borrowed buffers remain with their caller.
  CLexFile *tmpf;
  if (tmpf=cc->lex_include_stk) {
    if ((cc->lex_include_stk=tmpf->next) || !(cc->flags&CCF_DONT_FREE_BUF)) {
      if (tmpf->flags & LFSF_DOC) {
	if (tmpf->doc)
	  DocDel(tmpf->doc);
      } else
	Free(tmpf->buf);
    }
    Free(tmpf->full_name);
    Free(tmpf);
  }
  return cc->lex_include_stk;
}

U0 CmpCtrlDel(CCmpCtrl *cc)
{//Free compiler-control ownership, retaining borrowed hash tables.
  while (LexFilePop(cc));
  LinkedLstDel(cc->lex_prs_stk);
  LinkedLstDel(cc->htc.next);
  Free(cc->ps);
  Free(cc->cur_str);
  Free(cc->cur_help_idx);
  Free(cc->dollar_buf);
  Free(cc);
}

CCmpCtrl *CmpCtrlNew(U8 *buf=NULL,I64 flags=0,U8 *filename=NULL)
{//Adopt buf only after construction succeeds, unless DONT_FREE_BUF borrows it.
  CCmpCtrl *cc=NULL;
  CLexFile *tmpf;
  try {
    cc=CAlloc(sizeof(CCmpCtrl));
    QueInit(cc);
    cc->flags=flags;
    cc->opts=1<<OPTf_WARN_UNUSED_VAR|1<<OPTf_WARN_HEADER_MISMATCH;
    cc->htc.hash_mask=HTG_TYPE_MASK-HTT_IMPORT_SYS_SYM;
    cc->htc.define_hash_table=cc->htc.hash_table_lst=
	cc->htc.glbl_hash_table=cc->htc.local_hash_table=Fs->hash_table;
    if (flags&CCF_KEEP_AT_SIGN)
      cc->char_bmp_alpha_numeric=char_bmp_alpha_numeric_no_at;
    else
      cc->char_bmp_alpha_numeric=char_bmp_alpha_numeric;
    tmpf=LexFilePush(cc);
    QueInit(&cc->next_stream_blk);
    if (filename)
      tmpf->full_name=FileNameAbs(filename);
    else
      tmpf->full_name=StrNew(blkdev.tmp_filename);
    if (flags & CCF_PMT)
      buf=CAlloc(8);
    tmpf->buf=tmpf->buf_ptr=tmpf->line_start=cc->cur_buf_ptr=buf;
    tmpf->line_num=1;
  } catch {
    if (cc) CmpCtrlDel(cc);
  }
  return cc;
}

I64 CmpCtrlSize(CCmpCtrl *cc)
{//Native counted fields using this backend's actual allocation spans.
  CLexFile *tmpf=cc->lex_include_stk;
  I64 res=0;
  while (tmpf) {
    if (tmpf->next || !(cc->flags&CCF_DONT_FREE_BUF)) {
      if (tmpf->flags & LFSF_DOC) {
	if (tmpf->doc)
	  res+=DocSize(tmpf->doc);
      } else
	res+=MSize2(tmpf->buf);
    }
    res+=MSize2(tmpf->full_name);
    res+=MSize2(tmpf);
    tmpf=tmpf->next;
  }
  res+=MSize2(cc->cur_str);
  res+=MSize2(cc);
  return res;
}

U0 LexBackupLastChar(CCmpCtrl *cc)
{
  CLexFile *tmpf=cc->lex_include_stk;
  tmpf->buf_ptr=cc->cur_buf_ptr;
  if (cc->flags&CCF_USE_LAST_U16) {
    tmpf->last_U16=cc->last_U16;
    cc->flags&=~CCF_USE_LAST_U16;
  } else
    tmpf->last_U16=0;
}

U0 LexPush(CCmpCtrl *cc)
{//Save stream state without changing it when allocation fails.
  CLexFile *tmpf=MAlloc(sizeof(CLexFile));
  LexBackupLastChar(cc);
  if (cc->lex_include_stk->last_U16)
    cc->flags|=CCF_USE_LAST_U16;
  MemCpy(tmpf,cc->lex_include_stk,sizeof(CLexFile));
  tmpf->next=cc->lex_prs_stk;
  cc->lex_prs_stk=tmpf;
}

U0 LexPopRestore(CCmpCtrl *cc)
{//Restore a save point within the same include stream.
  CLexFile *tmpf=cc->lex_prs_stk;
  if (!tmpf) throw('LexState');
  cc->cur_buf_ptr=tmpf->buf_ptr;
  if (cc->last_U16=tmpf->last_U16)
    cc->flags|=CCF_USE_LAST_U16;
  else
    cc->flags&=~CCF_USE_LAST_U16;
  MemCpy(cc->lex_include_stk(U8 *)+sizeof(U8 *),tmpf(U8 *)+sizeof(U8 *),
	sizeof(CLexFile)-sizeof(U8 *));
  cc->lex_prs_stk=tmpf->next;
  Free(tmpf);
}

U0 LexPopNoRestore(CCmpCtrl *cc)
{//Discard the most recent save point.
  CLexFile *tmpf=cc->lex_prs_stk;
  if (!tmpf) throw('LexState');
  cc->lex_prs_stk=tmpf->next;
  Free(tmpf);
}
