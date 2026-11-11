//Native string-token extraction over the finite byte scanner.
export const LEX_EXT_SRC=String.raw`
U8 *LexExtStr(CCmpCtrl *cc,I64 *_size=NULL,Bool lex_next=TRUE)
{//Join string tokens; _size includes the terminator.
  I64 len,len1,len2;
  U8 *st,*st1=NULL,*st2=NULL;
  CLexFile *tmpf;
  if (!cc) throw('LexState');
  if (cc->token==TK_STR) {
    if (cc->flags&CCF_PMT) throw('LexMode');
    if (!cc->lex_include_stk) throw('LexState');
    for (tmpf=cc->lex_include_stk;tmpf;tmpf=tmpf->next)
      if (tmpf->flags&LFSF_DOC) throw('LexMode');
  }
  len=cc->cur_str_len;
  st=cc->cur_str;
  cc->cur_str=NULL;
  try {
    while (cc->token==TK_STR) {
      len1=len;
      if (!lex_next && LexGetChar(cc)!='\\') {
	cc->flags|=CCF_USE_LAST_U16;
	break;
      }
      if (Lex(cc)==TK_STR) {
	len2=cc->cur_str_len;
	st2=cc->cur_str;
	cc->cur_str=NULL;
	len=len1+len2-1;
	st1=MAlloc(len);
	if (len1>1) MemCpy(st1,st,len1-1);
	MemCpy(st1+len1-1,st2,len2);
	Free(st);
	Free(st2);
	st=st1;
	st1=st2=NULL;
      }
    }
  } catch {
    Free(st1);
    Free(st2);
    Free(st);
  }
  if (_size) *_size=len;
  return st;
}
`;
