U8 *LexExtStr(CCmpCtrl *cc,I64 *_size=NULL,Bool lex_next=TRUE)
{//Lex $LK,"TK_STR",A="MN:TK_STR"$'s to one combined str. _size includes terminator.
  I64 len=cc->cur_str_len,len1,len2;
  U8 *st=cc->cur_str,*st1,*st2;
  cc->cur_str=NULL;
  while (cc->token==TK_STR) {
    st1=st;
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
      st=MAlloc(len);
      if (len1>1)
	MemCpy(st,st1,len1-1);
      MemCpy(st+len1-1,st2,len2);
      Free(st1);
      Free(st2);
    }
  }
  if (_size) *_size=len;
  return st;
}
