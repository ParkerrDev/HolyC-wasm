//V5.03 Compiler/CMain.HC compiles text a statement at a time and runs
//each one (ExeCmdLine). The browser's compiler is in the host: it compiles
//the text against the program's symbols and runs it on this task.

I64 ExePutS(U8 *buf,U8 *filename=NULL,
	I64 ccf_flags=0,CLexHashTableContext *htc=NULL)
{//JIT Compile and execute text from a puts("").
  I64 res=0;
  no_warn ccf_flags,htc;
  if (!filename)
    filename=blkdev.tmp_filename;
  try {
    if (!__jit_exe(buf,filename,&res))
      throw('Compiler');
  } catch {
    if (Fs->except_ch=='Compiler' || Fs->except_ch=='Break') {
      Fs->catch_except=TRUE;
      res=0;
    }
  }
  return res;
}

I64 ExePrint(U8 *fmt,...)
{//JIT Compile and execute text from a printf().
  I64 res;
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  res=ExePutS(buf);
  Free(buf);
  return res;
}

I64 ExeFile(U8 *name,I64 ccf_flags=0)
{//JIT Compile and execute a file.
  I64 res;
  U8 *name2=ExtDft(name,"HC.Z"),
	*st=MStrPrint("#include \"%s\";",name2);
  res=ExePutS(st,name,ccf_flags);
  Free(st);
  Free(name2);
  return res;
}

I64 ExePutS2(U8 *buf,U8 *filename=NULL,I64 ccf_flags=0)
{//throws exceptions
  I64 res=0;
  no_warn ccf_flags;
  if (!filename)
    filename=blkdev.tmp_filename;
  if (!__jit_exe(buf,filename,&res))
    throw('Compiler');
  return res;
}

I64 ExePrint2(U8 *fmt,...)
{//throws exceptions
  I64 res;
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  res=ExePutS2(buf);
  Free(buf);
  return res;
}

I64 ExeFile2(U8 *name,I64 ccf_flags=0)
{//throws exceptions
  I64 res;
  U8 *name2=ExtDft(name,"HC.Z"),*st=MStrPrint("#include \"%s\";",name2);
  res=ExePutS2(st,name,ccf_flags);
  Free(st);
  Free(name2);
  return res;
}

CHashGlblVar *GlblVarHashAdd(U8 *st,U8 *data_addr,I64 size,I64 cnt,
	Bool is_array)
{//V5.03 PrsGlblVarLst's HashAdd of a glbl the host compiled at data_addr.
  CHashGlblVar *tmpg=CAlloc(sizeof(CHashGlblVar),Fs->code_heap);
  tmpg->data_addr=data_addr;
  tmpg->type=HTT_GLBL_VAR;
  tmpg->str=StrNew(st,Fs->code_heap);
  tmpg->size=size;
  tmpg->dim.total_cnt=cnt;
  if (is_array)
    tmpg->flags|=GVF_ARRAY;
  HashAdd(tmpg,Fs->hash_table);
  return tmpg;
}

//V5.03 Compiler/PrsLib.HC PrsKeyWord.
I64 PrsKeyWord(CCmpCtrl *cc)
{//Cvt cur token to $LK,"KEYWORD",A="FF:::/Compiler/OpCodes.DD,KEYWORD"$ or -1.
  CHashGeneric *tmph;
  if (cc->token==TK_IDENT &&(tmph=cc->hash_entry) && tmph->type&HTT_KEYWORD)
    return tmph->user_data0;
  else
    return -1;
}

//V5.03 LexStmt2Bin has PrsStmt parse a stmt and compiles its code. Here Lex
//reads the stmt's tokens as PrsStmt does, to one token beyond its end, and the
//host compiles them (src/jit.js statement). The bin is the code's function
//table entry, which $LK,"Call",A="MN:Call"$ calls; a stmt that only declares has
//no code (INVALID_PTR) and has run once it compiled.
U8 *LexStmt2Bin(CCmpCtrl *cc,I64 *_type,I64 cmp_flags=CMPF_PRS_SEMICOLON)
{//Compile one cc stmt to bin code.
  I64 depth=0,cnt=0,kw=-1,end=0;
  Bool to_semicolon;
  U8 *res;
  if (_type) *_type=RT_I64;
  while (cc->token==',')
    Lex(cc);
  if (cc->token==';') {
    if (cmp_flags&CMPF_PRS_SEMICOLON)
      Lex(cc);
    return INVALID_PTR;
  }
  to_semicolon=PrsKeyWord(cc)==KW_DO;
  try {
    while (cc->token!=TK_EOF) {
      if (cc->token=='}' && !depth)
	break; //The end of an $LK,"ExeCmdLine",A="MN:ExeCmdLine"$ block.
      switch (cc->token) {
	case '(':
	case '[':
	case '{':
	  depth++;
	  break;
	case ')':
	case ']':
	  depth--;
	  break;
	case '}':
	  if (!--depth && !to_semicolon) end='}';
	  break;
	case ';':
	  if (!depth) end=';';
	  break;
	case TK_IDENT:
	  kw=PrsKeyWord(cc);
	  if (!depth && (kw==KW_CLASS || kw==KW_UNION))
	    to_semicolon=TRUE;
	  break;
      }
      __jit_tok(cc->token,cc->cur_i64,cc->cur_f64,cc->cur_str,cc->cur_str_len);
      cnt++;
      Lex(cc);
      if (end) {
	kw=PrsKeyWord(cc);
	if (cc->token!=',' && kw!=KW_ELSE && kw!=KW_CATCH &&
	      (end!='}' || cc->token!=';'))
	  break;
	end=0;
      }
    }
  } catch
    __jit_del(0); //Drop the stmt's tokens.
  if (!cnt)
    return INVALID_PTR;
  if (!(res=__jit_stmt(_type)))
    LexExcept(cc,"Invalid statement at ");
  return res;
}

//V5.03 Kernel/KTask.HC ExeCmdLine.
I64 ExeCmdLine(CCmpCtrl *cc)
{//Terminal JIT-compile-and-execute loop for CCmpCtrl.
  I64 res=0,type,old_title_src=Fs->title_src;
  U8 *ptr,*ptr2,*ptr3,*machine_code,*old_task_title=StrNew(Fs->task_title);
  F64 t0;
  CDocEntry *doc_e;
  CDoc *doc;
  if (Fs->title_src!=TTS_LOCKED_CONST)
    Fs->title_src=TTS_CUR_LEX;
  while (cc->token &&
	(cc->token!='}' || !(cc->flags & CCF_EXE_BLK)) ) {
    if (Fs->title_src==TTS_CUR_LEX) {
      ptr2=&Fs->task_title;
      ptr3=ptr2+STR_LEN-1;
      if (cc->lex_include_stk->flags & LFSF_DOC) {
	doc_e=cc->lex_include_stk->cur_entry;
	doc=cc->lex_include_stk->doc;
	while (doc_e!=doc && ptr2<ptr3) {
	  switch (doc_e->type_u8) {
	    case DOCT_TEXT:
	      ptr=doc_e->tag;
	      while (*ptr && ptr2<ptr3)
		*ptr2++=*ptr++;
	      break;
	    case DOCT_TAB:
	    case DOCT_NEW_LINE:
	      *ptr2++='.';
	      break;
	  }
	  doc_e=doc_e->next;
	}
	if (ptr2<ptr3) *ptr2=0;
      } else
	if ((ptr=cc->lex_include_stk->line_start) && *ptr)
	  MemCpy(ptr2,ptr,STR_LEN-1);
    }
    cc->flags&=~CCF_HAS_MISC_DATA;
    machine_code=LexStmt2Bin(cc,&type);
    if (machine_code!=INVALID_PTR) {
      if (!(cc->flags&CCF_JUST_LOAD)) {
	t0=tS;
	res=Call(machine_code);
	Fs->answer=res;
	Fs->answer_type=type;
	Fs->answer_time=tS-t0;
	Fs->new_answer=TRUE;
	cc->pmt_line=0;
      }
//The bin is a function table entry, not a heap block (LexStmt2Bin).
//      if (!(cc->flags&CCF_HAS_MISC_DATA))
//	Free(machine_code);
    }
  }
  if (Fs->title_src!=TTS_LOCKED_CONST) {
    Fs->title_src=old_title_src;
    StrCpy(Fs->task_title,old_task_title);
  }
  Free(old_task_title);
  if (cc->flags&CCF_JUST_LOAD) {
    if (cc->error_cnt)
      return FALSE;
    else
      return TRUE;
  } else
    return res;
}
