//Finite native dollar-command descriptors; execution-backed arguments reject.
export const DOC_OUTPUT_SRC=String.raw`
#define DOCE_LEN_DFT 64

U0 DocParseOwnedFree(CDocEntry *entry)
{//Release only strings constructed by this parser, before clearing its flags.
  Free(entry->tag);entry->tag=NULL;
  Free(entry->aux_str);entry->aux_str=NULL;
  Free(entry->define_str);entry->define_str=NULL;
  Free(entry->html_link);entry->html_link=NULL;
  Free(entry->left_macro);entry->left_macro=NULL;
  Free(entry->right_macro);entry->right_macro=NULL;
  Free(entry->bin_ptr_link);entry->bin_ptr_link=NULL;
}

CDocEntry *PrsDollarCmd(CDoc *doc,U8 *st)
{//Parse finite command descriptors; executable arguments require TempleOS.
  I64 i,j,de_flags,processed_flags,attr=DOC_DFT;
  U8 *st2,*owned_st=NULL,*owned_st2=NULL;
  Bool reject;
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
      if (i==DOCT_DATA || i==DOCT_HEX_ED)
	throw('DocCaps');
      Lex(cc);
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
	    throw('DocCaps');
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
	switch [j] {
	  case DOCEf_TAG:
	    if (!doc_e->tag) {
//Macros and lists can supply their tag through another argument.
	      if (cc->token==TK_STR) {
		st2=owned_st=LexExtStr(cc);
		if (i==DOCT_CHECK_BOX) {
		  st=owned_st2=MStrPrint("[X] %s",st2);
		  Free(st2);owned_st=NULL;
		  doc_e->min_col=1;
		} else if (doc_e->de_flags & DOCEF_LST) {
		  if (*st2!='[') {
		    st=owned_st2=MStrPrint("[%s]",st2);
		    Free(st2);owned_st=NULL;
		  } else
		    st=st2;
		  doc_e->min_col=1;
		} else if (doc_e->de_flags & DOCEF_TREE) {
		  st=owned_st2=MStrPrint("+] %s",st2);
		  Free(st2);owned_st=NULL;
		  doc_e->min_col=1;
		} else
		  st=st2;
		doc_e->tag=StrNew(st,doc->mem_task);
		Free(st);owned_st=owned_st2=NULL;
	      } else
		goto pd_err;
	    }
	    break;
	  case DOCEf_LEN:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_AUX_STR:
	    if (cc->token==TK_STR) {
	      st2=owned_st=LexExtStr(cc);
	      doc_e->aux_str=StrNew(st2,doc->mem_task);
	      Free(st2);owned_st=NULL;
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_DEFINE:
	    if (cc->token==TK_STR) {
	      st2=owned_st=LexExtStr(cc);
	      doc_e->define_str=StrNew(st2,doc->mem_task);
	      Free(st2);owned_st=NULL;
	      if (doc_e->de_flags&DOCEF_LST && !doc_e->tag)
		doc_e->tag=StrNew("[]",doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_HTML_LINK:
	    if (cc->token==TK_STR) {
	      st2=owned_st=LexExtStr(cc);
	      doc_e->html_link=StrNew(st2,doc->mem_task);
	      Free(st2);owned_st=NULL;
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_LEFT_EXP:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_LEFT_MACRO:
	    if (cc->token==TK_STR) {
	      st2=owned_st=LexExtStr(cc);
	      doc_e->left_macro=StrNew(st2,doc->mem_task);
	      Free(st2);owned_st=NULL;
	      if (i==DOCT_MACRO && !doc_e->tag)
		doc_e->tag=StrNew(doc_e->left_macro,doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_RIGHT_EXP:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_RIGHT_MACRO:
	    if (cc->token==TK_STR) {
	      st2=owned_st=LexExtStr(cc);
	      doc_e->right_macro=StrNew(st2,doc->mem_task);
	      Free(st2);owned_st=NULL;
	      if (i==DOCT_MACRO && !doc_e->tag)
		doc_e->tag=StrNew(doc_e->right_macro,doc->mem_task);
	    } else
	      goto pd_err;
	    break;
	  case DOCEf_HAS_BIN:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_BIN_PTR_LINK:
	    if (cc->token==TK_STR)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_RAW_TYPE:
	    if (cc->token==TK_IDENT)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_SHIFTED_X:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_SHIFTED_Y:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_SCROLLING_X:
	    if (cc->token)
	      throw('DocCaps');
	    else
	      goto pd_err;
	    break;
	  case DOCEf_USER_DATA:
	    if (cc->token)
	      throw('DocCaps');
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
      DocParseOwnedFree(doc_e);
      doc_e->type=DOCT_ERROR;
      doc_e->de_flags=0;
    }
    if (doc_e->de_flags&DOCEF_LST && (doc_e->de_flags&DOCEF_REMALLOC_DATA ||
	  !(doc_e->de_flags&DOCEF_DEREF_DATA))) {
      throw('DocCaps');
    }
    CmpCtrlDel(cc);cc=NULL;
  } catch {
    reject=Fs->except_ch=='DocCaps' || Fs->except_ch=='LexCaps' ||
	  Fs->except_ch=='LexMode';
    Free(owned_st);Free(owned_st2);
    if (cc) CmpCtrlDel(cc);
    if (reject) {
      if (doc_e) DocParseOwnedFree(doc_e);
      Free(doc_e);
      doc_e=NULL;
    } else {
      Fs->catch_except=TRUE;
      if (!doc_e)
	doc_e=CAlloc(sizeof(CDocEntry),doc->mem_task);
      DocParseOwnedFree(doc_e);
      doc_e->type=DOCT_ERROR;
      doc_e->de_flags=0;
    }
  }
  return doc_e;
}
`;
