CDocEntry *PrsDollarCmd(CDoc *doc,U8 *st)
{//Uses $LK-UL,"Lex",A="MN:Lex"$() to parse a string and make Doc entries.
  I64 i,j,de_flags,processed_flags,attr=DOC_DFT;
  U8 *ptr,*st2;
  CDocEntry *doc_e=NULL;
  CHashGeneric *tmph;
  CCmpCtrl *cc=CmpCtrlNew(st,CCF_DONT_FREE_BUF);
  CHashTable *old_hash_table_lst=cc->htc.hash_table_lst;
  try {
    cc->htc.hash_table_lst=NULL;
    if (Lex(cc)==TK_IDENT) {
      if (tmph=HashFind(cc->cur_str,doldoc.hash,DHT_DOC_CMD|DHT_COLOR)) {
	if (tmph->type&DHT_DOC_CMD)
	  i=tmph->user_data0;
	else {//DHT_COLOR
	  i=DOCT_FOREGROUND;
	  attr=tmph->user_data0;
	}
      } else
	goto pd_err;
      Lex(cc); //skip cmd code
      doc_e=CAlloc(sizeof(CDocEntry),doc->mem_task);
      doc_e->type=i;
      doc_e->de_flags=doldoc.dft_de_flags[i];
      doc_e->type|=doldoc.dft_type_flags[i];
      doc_e->raw_type=RT_I64;
      doc_e->len=DOCE_LEN_DFT;
      j=PrsDocFlags(cc,&doc_e->de_flags,&doc_e->type);
      cc->htc.hash_table_lst=old_hash_table_lst;
      switch [i] {
	case DOCT_CHECK_BOX:
	  doc_e->raw_type=RT_I8;
	  break;
	case DOCT_HEX_ED:
	  while (cc->token==',')
	    Lex(cc);
	  if (cc->token)
	    doc_e->len=LexExpressionI64(cc);
	  else
	    goto pd_err;
	  while (cc->token==',')
	    Lex(cc);
	  if (cc->token)
	    doc_e->hex_ed_width=LexExpressionI64(cc);
	  else
	    goto pd_err;
	  break;
	case DOCT_PAGE_LEN:
	case DOCT_LEFT_MARGIN:
	case DOCT_RIGHT_MARGIN:
	case DOCT_HEADER:
	case DOCT_FOOTER:
	case DOCT_INDENT:
	case DOCT_FOREGROUND:
	case DOCT_BACKGROUND:
	case DOCT_DFT_FOREGROUND:
	case DOCT_DFT_BACKGROUND:
	case DOCT_WORD_WRAP:
	case DOCT_HIGHLIGHT:
	case DOCT_BLINK:
	case DOCT_INVERT:
	case DOCT_UNDERLINE:
	case DOCT_SHIFTED_X:
	case DOCT_SHIFTED_Y:
	  while (cc->token==',')
	    Lex(cc);
	  if (cc->token)
	    doc_e->attr=LexExpressionI64(cc);
	  else
	    doc_e->attr=attr;
	  break;
#assert DOCT_ERROR==DOCT_TYPES_NUM-1
	case DOCT_ERROR:
	  goto pd_err;
      }

      processed_flags=0;
      while (TRUE) {
	cc->htc.hash_table_lst=NULL;
	while (cc->token==',')
	  Lex(cc);
	cc->htc.hash_table_lst=old_hash_table_lst;
	j=PrsDocFlagSingle(cc,&doc_e->de_flags,&doc_e->type,TRUE);
	if (!(de_flags=~processed_flags & doc_e->de_flags & DOCEG_HAS_ARG))
	  break;
	if (cc->token=='=')
	  Lex(cc);
	else
	  j=Bsf(de_flags);
	if (j<0 || Bts(&processed_flags,j))
	  goto pd_err;
	switch [j] {//TODO: Might check for expression errors
	  case DOCEf_TAG:
	    if (!doc_e->tag) {
//If a $$MA,LM=""$$, Tag is filled when the LM is processed.
	      //if doc_e->df_flags&DOCEF_LST,
	      // Tag is filled when the Define is processed.
	      //(The dft_flag1.tag calls this after.)
	      if (cc->token==TK_STR) {
		st2=LexExtStr(cc);
		if (i==DOCT_CHECK_BOX) {
		  st=MStrPrint("[X] %s",st2);
		  Free(st2);
		  doc_e->min_col=1;
		} else if (doc_e->de_flags & DOCEF_LST) {
		  if (*st2!='[') {
		    st=MStrPrint("[%s]",st2);
		    Free(st2);
		  } else
		    st=st2;
		  doc_e->min_col=1;
		} else if (doc_e->de_flags & DOCEF_TREE) {
		  st=MStrPrint("+] %s",st2);
		  Free(st2);
		  doc_e->min_col=1;
		} else
		  st=st2;
		doc_e->tag=StrNew(st,doc->mem_task);
		Free(st);
	      } else
		goto pd_err;
	    }
	    break;
	  case DOCEf_LEN:
	    if (cc->token) {
	      doc_e->len=LexExpression(cc);
	      doc_e->de_flags&=~DOCEF_DFT_LEN;
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_AUX_STR:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->aux_str=StrNew(st2,doc->mem_task);
	      Free(st2);
//$AN,"Anchor",A="DataTagWidth"$
	      if (i==DOCT_DATA) { //See $LK,"DocForm",A="MN:DocForm"$()
		if (ptr=StrMatch(":",doc_e->aux_str))
		  doc_e->min_col=ptr-doc_e->aux_str+1;
		doc_e->tag=MAlloc(doc_e->len+doc_e->min_col+2,
		      doc->mem_task); //+2 because "_\0"
	      }
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_DEFINE:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->define_str=StrNew(st2,doc->mem_task);
	      Free(st2);
	      if (doc_e->de_flags&DOCEF_LST && !doc_e->tag)
		doc_e->tag=StrNew("[]",doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_HTML_LINK:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->html_link=StrNew(st2,doc->mem_task);
	      Free(st2);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_LEFT_EXP:
	    if (cc->token)
	      doc_e->left_exp=LexExpression(cc);
	    else
	      goto pd_err;
	    break;
	  case DOCEf_LEFT_MACRO:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->left_macro=StrNew(st2,doc->mem_task);
	      Free(st2);
	      if (i==DOCT_MACRO && !doc_e->tag)
		doc_e->tag=StrNew(doc_e->left_macro,doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_RIGHT_EXP:
	    if (cc->token)
	      doc_e->right_exp=LexExpression(cc);
	    else
	      goto pd_err;
	    break;
	  case DOCEf_RIGHT_MACRO:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->right_macro=StrNew(st2,doc->mem_task);
	      Free(st2);
	      if (i==DOCT_MACRO && !doc_e->tag)
		doc_e->tag=StrNew(doc_e->right_macro,doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_HAS_BIN:
	    if (cc->token)
	      doc_e->bin_num=LexExpressionI64(cc);
	    else
	      goto pd_err;
	    break;
	  case DOCEf_BIN_PTR_LINK:
	    if (cc->token==TK_STR) {
	      st2=LexExtStr(cc);
	      doc_e->bin_ptr_link=StrNew(st2,doc->mem_task);
	      Free(st2);
	      if (!DocBinPtrRst(doc,doc_e))
		doc_e->type=DOCT_ERROR;
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_RAW_TYPE:
	    if (cc->token==TK_IDENT) {
	      j=DefineMatch(cc->cur_str,"ST_RAW_TYPES");
	      if (j<0)
		goto pd_err;
	      doc_e->raw_type=j;
	      doc_e->de_flags&=~DOCEF_DFT_RAW_TYPE;
	      Lex(cc);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_SHIFTED_X:
	    if (cc->token)
	      doc_e->type|=(LexExpressionI64(cc) & 0x1F)<<16;
	    else
	      goto pd_err;
	    break;
	  case DOCEf_SHIFTED_Y:
	    if (cc->token)
	      doc_e->type|=(LexExpressionI64(cc) & 0x1F)<<21;
	    else
	      goto pd_err;
	    break;
	  case DOCEf_SCROLLING_X:
	    if (cc->token)
	      doc_e->scroll_len=LexExpressionI64(cc);
	    else
	      goto pd_err;
	    break;
	  case DOCEf_USER_DATA:
	    if (cc->token)
	      doc_e->user_data=LexExpression(cc);
	    else
	      goto pd_err;
	    break;
	  case DOCEf_FLAGS_NUM-1: //nobound switch
	    break;
	}
      }
    } else {
pd_err:
      if (!doc_e)
	doc_e=CAlloc(sizeof(CDocEntry),doc->mem_task);
      doc_e->type=DOCT_ERROR;
      doc_e->de_flags=0;
    }
    if (doc_e->de_flags&DOCEF_LST && (doc_e->de_flags&DOCEF_REMALLOC_DATA ||
	  !(doc_e->de_flags&DOCEF_DEREF_DATA))) {
      DocDataScan(doc,doc_e);
      DocDataFmt(doc,doc_e);
    }
    CmpCtrlDel(cc);
  } catch {
    Fs->catch_except=TRUE;
    if (!doc_e)
      doc_e=CAlloc(sizeof(CDocEntry),doc->mem_task);
    doc_e->type=DOCT_ERROR;
    doc_e->de_flags=0;
  }
  return doc_e;
}
