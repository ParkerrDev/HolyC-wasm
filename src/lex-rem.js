//Native marker scan with cleanup when buffer allocation fails.
export const LEX_REM_SRC=String.raw`
U8 *LexFirstRem(CCmpCtrl *cc,U8 *marker,I64 _len=NULL)
{//Read until a marker, leaving it for the next character read.
  U8 *res=NULL,*ptr;
  CQueVectU8 *tmpv=NULL;
  I64 i,len=0;
  try {
    tmpv=QueVectU8New;
    while (TRUE) {
      i=LexGetChar(cc);
      if (!i || StrOcc(marker,i))
	break;
      QueVectU8Put(tmpv,len++,i);
    }
    if (i)
      Bts(&cc->flags,CCf_USE_LAST_U16);
    res=ptr=MAlloc(len+1);
    for (i=0;i<len;i++)
      *ptr++=QueVectU8Get(tmpv,i);
    *ptr=0;
  } catch {
    Free(res);
    QueVectU8Del(tmpv);
  }
  QueVectU8Del(tmpv);
  if (_len) *_len=len;
  return res;
}
`;
