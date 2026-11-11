U64 cmp_control_hash=0;
I64 cmp_control_cnt=0;

U0 CmpControlMix(I64 value)
{
  cmp_control_hash=(cmp_control_hash^value)*1099511628211;
  cmp_control_cnt++;
}

U0 CmpControl()
{
  I64 i,j,flags,expected;
  U8 *buf;
  CCmpCtrl *cc;
  CLexFile *tmpf,*outer;
  CLexHashTableContext *context;
  cmp_control_hash=14695981039346656037;
  cmp_control_cnt=0;
  CmpControlMix(sizeof(CCmpCtrl));
  CmpControlMix(sizeof(CLexFile));
  CmpControlMix(sizeof(CLexHashTableContext));
  CmpControlMix(sizeof(CCodeCtrl));
  CmpControlMix(sizeof(CPrsStk));
  CmpControlMix(sizeof(char_bmp_alpha_numeric));
  CmpControlMix(offset(CCmpCtrl.next));
  CmpControlMix(offset(CCmpCtrl.last));
  CmpControlMix(offset(CCmpCtrl.token));
  CmpControlMix(offset(CCmpCtrl.flags));
  CmpControlMix(offset(CCmpCtrl.cur_i64));
  CmpControlMix(offset(CCmpCtrl.cur_f64));
  CmpControlMix(offset(CCmpCtrl.cur_str));
  CmpControlMix(offset(CCmpCtrl.cur_str_len));
  CmpControlMix(offset(CCmpCtrl.class_dol_offset));
  CmpControlMix(offset(CCmpCtrl.dollar_buf));
  CmpControlMix(offset(CCmpCtrl.dollar_cnt));
  CmpControlMix(offset(CCmpCtrl.cur_help_idx));
  CmpControlMix(offset(CCmpCtrl.last_U16));
  CmpControlMix(offset(CCmpCtrl.min_line));
  CmpControlMix(offset(CCmpCtrl.max_line));
  CmpControlMix(offset(CCmpCtrl.last_line_num));
  CmpControlMix(offset(CCmpCtrl.lock_cnt));
  CmpControlMix(offset(CCmpCtrl.char_bmp_alpha_numeric));
  CmpControlMix(offset(CCmpCtrl.htc));
  CmpControlMix(offset(CCmpCtrl.hash_entry));
  CmpControlMix(offset(CCmpCtrl.abs_cnts));
  CmpControlMix(offset(CCmpCtrl.asm_undef_hash));
  CmpControlMix(offset(CCmpCtrl.local_var_entry));
  CmpControlMix(offset(CCmpCtrl.lb_leave));
  CmpControlMix(offset(CCmpCtrl.cur_buf_ptr));
  CmpControlMix(offset(CCmpCtrl.lex_include_stk));
  CmpControlMix(offset(CCmpCtrl.lex_prs_stk));
  CmpControlMix(offset(CCmpCtrl.fun_lex_file));
  CmpControlMix(offset(CCmpCtrl.next_stream_blk));
  CmpControlMix(offset(CCmpCtrl.last_stream_blk));
  CmpControlMix(offset(CCmpCtrl.aot));
  CmpControlMix(offset(CCmpCtrl.pass));
  CmpControlMix(offset(CCmpCtrl.opts));
  CmpControlMix(offset(CCmpCtrl.pass_trace));
  CmpControlMix(offset(CCmpCtrl.saved_pass_trace));
  CmpControlMix(offset(CCmpCtrl.error_cnt));
  CmpControlMix(offset(CCmpCtrl.warning_cnt));
  CmpControlMix(offset(CCmpCtrl.cur_ic_float_op_num));
  CmpControlMix(offset(CCmpCtrl.last_ic_float_op_num));
  CmpControlMix(offset(CCmpCtrl.last_float_op_ic));
  CmpControlMix(offset(CCmpCtrl.last_dont_pushable));
  CmpControlMix(offset(CCmpCtrl.last_dont_popable));
  CmpControlMix(offset(CCmpCtrl.last_float_op_pos));
  CmpControlMix(offset(CCmpCtrl.dont_push_float));
  CmpControlMix(offset(CCmpCtrl.pad));
  CmpControlMix(offset(CCmpCtrl.coc));
  CmpControlMix(offset(CCmpCtrl.ps));
  CmpControlMix(offset(CCmpCtrl.aotc));
  CmpControlMix(offset(CCmpCtrl.aot_depth));
  CmpControlMix(offset(CCmpCtrl.pmt_line));
  CmpControlMix(offset(CLexFile.next));
  CmpControlMix(offset(CLexFile.buf));
  CmpControlMix(offset(CLexFile.buf_ptr));
  CmpControlMix(offset(CLexFile.line_num));
  CmpControlMix(offset(CLexFile.flags));
  CmpControlMix(offset(CLexFile.full_name));
  CmpControlMix(offset(CLexFile.line_start));
  CmpControlMix(offset(CLexFile.doc));
  CmpControlMix(offset(CLexFile.cur_entry));
  CmpControlMix(offset(CLexFile.depth));
  CmpControlMix(offset(CLexFile.last_U16));
  CmpControlMix(offset(CLexFile.pad));
  CmpControlMix(offset(CLexHashTableContext.next));
  CmpControlMix(offset(CLexHashTableContext.old_flags));
  CmpControlMix(offset(CLexHashTableContext.hash_mask));
  CmpControlMix(offset(CLexHashTableContext.local_var_lst));
  CmpControlMix(offset(CLexHashTableContext.fun));
  CmpControlMix(offset(CLexHashTableContext.hash_table_lst));
  CmpControlMix(offset(CLexHashTableContext.define_hash_table));
  CmpControlMix(offset(CLexHashTableContext.local_hash_table));
  CmpControlMix(offset(CLexHashTableContext.glbl_hash_table));
  CmpControlMix(offset(CCodeCtrl.coc_next));
  CmpControlMix(offset(CCodeCtrl.coc_next_misc));
  CmpControlMix(offset(CCodeCtrl.coc_last_misc));
  CmpControlMix(offset(CCodeCtrl.coc_head));
  CmpControlMix(offset(CIntermediateCodeBase.next));
  CmpControlMix(offset(CIntermediateCodeBase.last));
  CmpControlMix(offset(CIntermediateCodeBase.ic_code));
  CmpControlMix(offset(CIntermediateCodeBase.ic_precedence));
  CmpControlMix(offset(CIntermediateCodeBase.ic_cnt));
  CmpControlMix(offset(CIntermediateCodeBase.ic_last_start));
  CmpControlMix(offset(CAbsCntsI64.abs_addres));
  CmpControlMix(offset(CAbsCntsI64.c_addres));
  CmpControlMix(offset(CAbsCntsI64.externs));
  CmpControlMix(offset(CPrsStk.ptr));
  CmpControlMix(offset(CPrsStk.stk));
  CmpControlMix(offset(CPrsStk.ptr2));
  CmpControlMix(offset(CPrsStk.stk2));
  for (i=0;i<64;i++) {
    flags=0;
    if (i&1) flags|=CCF_KEEP_AT_SIGN;
    if (i&2) flags|=CCF_DONT_FREE_BUF;
    if (i&4) flags|=CCF_NO_DEFINES;
    if (i&8) flags|=CCF_KEEP_NEW_LINES;
    if (i&16) flags|=CCF_KEEP_DOT;
    buf=StrNew("alpha\nbeta");
    if (i&32) cc=CmpCtrlNew(buf,flags,"C:/Tmp.HC");
    else cc=CmpCtrlNew(buf,flags);
    outer=cc->lex_include_stk;
    if (cc->next!=cc || cc->last!=cc ||
	cc->next_stream_blk!=&cc->next_stream_blk ||
	cc->last_stream_blk!=&cc->next_stream_blk)
      throw('CmpQueue');
    if (cc->htc.hash_table_lst!=Fs->hash_table ||
	cc->htc.define_hash_table!=Fs->hash_table ||
	cc->htc.local_hash_table!=Fs->hash_table ||
	cc->htc.glbl_hash_table!=Fs->hash_table)
      throw('CmpHash');
    if (outer->buf!=buf || outer->buf_ptr!=buf ||
	outer->line_start!=buf || cc->cur_buf_ptr!=buf)
      throw('CmpBuf');
    if (i&32) CmpControlMix(!StrCmp(outer->full_name,"C:/Tmp.HC"));
    else CmpControlMix(!StrCmp(outer->full_name,blkdev.tmp_filename));
    CmpControlMix(cc->flags);
    CmpControlMix(cc->opts);
    CmpControlMix(cc->htc.hash_mask);
    CmpControlMix(outer->line_num);
    CmpControlMix(outer->depth);
    for (j=0;j<512;j++)
      CmpControlMix(Bt(cc->char_bmp_alpha_numeric,j));
    expected=MSize2(cc)+MSize2(outer)+MSize2(outer->full_name);
    if (!(flags&CCF_DONT_FREE_BUF)) expected+=MSize2(buf);
    CmpControlMix(CmpCtrlSize(cc)==expected);
    tmpf=LexFilePush(cc);
    tmpf->buf=StrNew("nested");
    tmpf->full_name=StrNew("nested.HC");
    CmpControlMix(tmpf->depth);
    CmpControlMix(tmpf->next==outer);
    expected+=MSize2(tmpf)+MSize2(tmpf->buf)+MSize2(tmpf->full_name);
    cc->cur_str=StrNew("token");
    expected+=MSize2(cc->cur_str);
    cc->ps=CAlloc(sizeof(CPrsStk));
    cc->cur_help_idx=StrNew("help");
    cc->dollar_buf=StrNew("dollar");
    context=CAlloc(sizeof(CLexHashTableContext));
    context->hash_table_lst=Fs->hash_table;
    cc->htc.next=context;
    CmpControlMix(CmpCtrlSize(cc)==expected);
    CmpControlMix(LexFilePop(cc)==outer);
    cc->cur_buf_ptr=buf;
    for (j=0;j<512;j++) {
      cc->cur_buf_ptr=buf+j%10;
      cc->last_U16=j;
      cc->flags=flags;
      if (j&1) cc->flags|=CCF_USE_LAST_U16;
      outer->line_num=j+1;
      LexPush(cc);
      CmpControlMix(cc->lex_prs_stk->buf_ptr-buf);
      CmpControlMix(cc->lex_prs_stk->last_U16);
      CmpControlMix(cc->flags);
      cc->cur_buf_ptr=buf;
      cc->last_U16=-1;
      outer->line_num=999;
      LexPopRestore(cc);
      CmpControlMix(cc->cur_buf_ptr-buf);
      CmpControlMix(cc->last_U16);
      CmpControlMix(outer->line_num);
      CmpControlMix(cc->flags);
      LexPush(cc);
      cc->cur_buf_ptr=buf+2;
      LexPopNoRestore(cc);
      CmpControlMix(cc->cur_buf_ptr-buf);
    }
    LexPush(cc);
    CmpCtrlDel(cc);
    if (flags&CCF_DONT_FREE_BUF) {
      if (StrCmp(buf,"alpha\nbeta")) throw('CmpOwn');
      Free(buf);
    }
  }
  "CmpControl:%016X:%d\n",cmp_control_hash,cmp_control_cnt;
}

CmpControl;
