U64 lex_str_hash=14695981039346656037;
I64 lex_str_cnt=0,lex_str_lines=0;

U0 LexStrMix(I64 value)
{
  lex_str_hash=(lex_str_hash^value)*1099511628211;
  lex_str_cnt++;
}

U8 *LexStrInput(I64 mode,I64 ch)
{
  U8 *buf=CAlloc(16);
  switch (mode) {
    case 0:
      buf[0]=ch;buf[1]='Q';buf[2]='"';buf[3]='Z';
      break;
    case 1:
      buf[0]='\\';buf[1]=ch;buf[2]='4';buf[3]='7';
      buf[4]='"';buf[5]='Z';
      break;
    case 2:
      buf[0]='$$';buf[1]=ch;buf[2]='$$';buf[3]='Q';
      buf[4]='"';buf[5]='Z';
      break;
  }
  return buf;
}

U0 LexStrState(CCmpCtrl *cc)
{
  CLexFile *tmpf=cc->lex_include_stk;
  LexStrMix(cc->cur_buf_ptr-tmpf->buf);
  LexStrMix(cc->last_U16);
  LexStrMix(cc->flags);
  LexStrMix(cc->dollar_cnt);
  LexStrMix(tmpf->line_start-tmpf->buf);
  LexStrMix(tmpf->line_num);
  LexStrMix(cmp.compiled_lines-lex_str_lines);
}

U0 LexString()
{
  I64 mode,ch,size,dollars,i,j,cnt;
  Bool done;
  U8 dst[32],*src;
  CCmpCtrl *cc;
  lex_str_hash=14695981039346656037;
  lex_str_cnt=0;
  lex_str_lines=cmp.compiled_lines;
  for (mode=0;mode<3;mode++)
    for (ch=0;ch<256;ch++)
      for (size=-1;size<=10;size++)
	for (dollars=0;dollars<3;dollars++) {
	  cc=CmpCtrlNew(LexStrInput(mode,ch));
	  cc->dollar_cnt=dollars;
	  MemSet(dst,0xA5,sizeof(dst));
	  done=TRUE;
	  LexStrMix(LexInStr(cc,dst+4,size,&done));
	  LexStrMix(done);
	  for (i=0;i<sizeof(dst);i++) LexStrMix(dst[i]);
	  LexStrState(cc);
	  CmpCtrlDel(cc);
	}
  for (size=2;size<18;size++) {
    src=StrNew("ab\\0c\\x4G\\d$$$$e\\q\\n\\\"f\"tail");
    cc=CmpCtrlNew(src);
    cnt=0;j=0;
    do {
      MemSet(dst,0xA5,sizeof(dst));
      i=LexInStr(cc,dst,size,&done);
      LexStrMix(i);
      LexStrMix(done);
      for (ch=0;ch<i;ch++) LexStrMix(dst[ch]);
      LexStrState(cc);
      cnt+=i;
      if (++j>64) throw('StrLoop');
    } while (!done);
    LexStrMix(cnt);
    LexStrMix(LexGetChar(cc));
    CmpCtrlDel(cc);
  }
  for (mode=0;mode<3;mode++)
    for (size=2;size<18;size++)
      for (dollars=0;dollars<2;dollars++) {
	switch (mode) {
	  case 0:
	    cc=CmpCtrlNew(StrNew("x41\"R"));
	    src=StrNew("B\\");
	    break;
	  case 1:
	    cc=CmpCtrlNew(StrNew("A\"R"));
	    src=StrNew("\\x");
	    break;
	  case 2:
	    cc=CmpCtrlNew(StrNew("$$C\"R"));
	    src=StrNew("D$$");
	    break;
	}
	if (dollars) {
	  LexGetChar(cc);
	  cc->flags|=CCF_USE_LAST_U16;
	}
	LexIncludeStr(cc,NULL,src,FALSE);
	j=0;
	do {
	  MemSet(dst,0xA5,sizeof(dst));
	  i=LexInStr(cc,dst,size,&done);
	  LexStrMix(i);
	  LexStrMix(done);
	  for (ch=0;ch<i;ch++) LexStrMix(dst[ch]);
	  LexStrState(cc);
	  if (++j>64) throw('StrLoop');
	} while (!done);
	LexStrMix(LexGetChar(cc));
	CmpCtrlDel(cc);
      }
  "LexString:%016X:%d\n",lex_str_hash,lex_str_cnt;
}

LexString;
