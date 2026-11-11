U64 doc_flag_hash=0;
I64 doc_flag_cnt=0;

U0 DocFlagMix(I64 n)
{
  doc_flag_hash=(doc_flag_hash^n)*1099511628211;
}

U0 DocFlagCase(U8 *src,I64 initial,I64 kind)
{
  CCmpCtrl *cc=CmpCtrlNew(src,CCF_DONT_FREE_BUF);
  I64 flags=initial,res,i,type=initial&0xFFFFFFFF|0x6A7B8C9D<<32;
  cc->htc.hash_table_lst=NULL;
  Lex(cc);
  switch (kind) {
    case 0:
      res=PrsDocFlags(cc,&flags,&type.u32[0]);
      break;
    case 1:
    case 2:
      res=PrsDocFlagSingle(cc,&flags,&type.u32[0],kind==1);
      break;
    case 3:
      res=PrsDocFlags(cc,&flags,(&flags)(U32 *));
      break;
  }
  if (type.u32[1]!=0x6A7B8C9D) throw('DocWidth');
  DocFlagMix(res);
  DocFlagMix(flags);
  DocFlagMix(type);
  DocFlagMix(cc->token);
  DocFlagMix(cc->flags);
  DocFlagMix(cc->cur_buf_ptr-cc->lex_include_stk->buf);
  DocFlagMix(cc->cur_str_len);
  if (cc->cur_str)
    for (i=0;i<cc->cur_str_len;i++) DocFlagMix(cc->cur_str[i]);
  CmpCtrlDel(cc);
  doc_flag_cnt++;
}

U0 DocFlags()
{
  I64 i,j,k,initial;
  U8 *name,*chain;
  doc_flag_hash=14695981039346656037;
  doc_flag_cnt=0;
  for (i=0;i<DefineCnt("ST_DOC_FLAGS");i++) {
    name=DefineSub(i,"ST_DOC_FLAGS");
    chain=MStrPrint("+%s-%s+%s;",name,name,name);
    for (j=0;j<4;j++) {
      switch (j) {
	case 0:
	  initial=0;
	  break;
	case 1:
	  initial=-1;
	  break;
	case 2:
	  initial=0x1234567800000000;
	  break;
	case 3:
	  initial=0x8000000080000001;
	  break;
      }
      DocFlagCase(chain,initial,0);
      DocFlagCase(chain,initial,3);
      for (k=1;k<=2;k++) DocFlagCase(name,initial,k);
    }
    Free(chain);
  }
  DocFlagCase("+T+Unknown-B;",0,0);
  DocFlagCase("+T-Unknown+B;",-1,0);
  DocFlagCase("+",0,0);
  DocFlagCase("-",-1,0);
  DocFlagCase(";",0,0);
  DocFlagCase("1",-1,1);
  DocFlagCase("\"T\"",0,2);
  DocFlagCase("Unknown",-1,2);
  DocFlagCase("+ BK - IV + UL - SEL + T;",0,0);
  "DocFlags:%016X:%d\n",doc_flag_hash,doc_flag_cnt;
}

DocFlags;
