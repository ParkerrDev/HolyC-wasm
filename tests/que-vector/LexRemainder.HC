U64 rem_hash=14695981039346656037;
I64 rem_cnt=0,rem_lines=0;
I64 rem_lens[9]={0,1,511,512,513,1023,1024,1025,2001};
U8 *rem_markers[7]={"","\n","\x1F","\x05","\xFF","XYZ"," "};

U0 RemMix(I64 value)
{
  rem_hash=(rem_hash^value)*1099511628211;
  rem_cnt++;
}

U8 *RemInput(I64 len)
{
  I64 i;
  U8 *res=CAlloc(len+1);
  for (i=0;i<len;i++) res[i]=1+i%255;
  return res;
}

U0 RemRead(CCmpCtrl *cc,U8 *marker)
{
  I64 i,len=-3;
  U8 *res=LexFirstRem(cc,marker,&len);
  CLexFile *tmpf=cc->lex_include_stk;
  RemMix(len);RemMix(StrLen(res));
  for (i=0;i<=len;i++) RemMix(res[i]);
  RemMix(cc->cur_buf_ptr-tmpf->buf);
  RemMix(tmpf->line_start-tmpf->buf);
  RemMix(tmpf->line_num);RemMix(tmpf->depth);
  RemMix(cc->last_U16);RemMix(cc->flags);
  RemMix(cmp.compiled_lines-rem_lines);
  RemMix(LexGetChar(cc));
  Free(res);
}

U0 LexRemainder()
{
  I64 i,j,k;
  U8 *res;
  CCmpCtrl *cc;
  rem_hash=14695981039346656037;rem_cnt=0;
  rem_lines=cmp.compiled_lines;
  for (i=0;i<9;i++)
    for (j=0;j<7;j++)
      for (k=0;k<3;k++) {
	cc=CmpCtrlNew(RemInput(rem_lens[i]));
	if (k) LexGetChar(cc);
	if (k==1) cc->flags|=CCF_USE_LAST_U16;
	RemRead(cc,rem_markers[j]);
	RemRead(cc,"");
	CmpCtrlDel(cc);
      }
  cc=CmpCtrlNew(StrNew("A\nB|tail"));
  LexGetChar(cc);cc->flags|=CCF_USE_LAST_U16;
  LexIncludeStr(cc,NULL,StrNew("C\nD"),FALSE);
  LexIncludeStr(cc,NULL,StrNew("E\nF"),FALSE);
  RemRead(cc,"|");RemRead(cc,"");
  CmpCtrlDel(cc);
  cc=CmpCtrlNew("abc",CCF_DONT_FREE_BUF);
  res=LexFirstRem(cc,"b");
  RemMix(!StrCmp(res,"a"));Free(res);
  RemMix(LexGetChar(cc));
  CmpCtrlDel(cc);
  "LexRemainder:%016X:%d\n",rem_hash,rem_cnt;
}

LexRemainder;
