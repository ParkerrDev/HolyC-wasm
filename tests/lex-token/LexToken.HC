U64 token_hash=0;
I64 token_cases=0,token_steps=0;

U0 TokenMix(I64 n)
{
  token_hash=(token_hash^n)*1099511628211;
}

U0 TokenStr(U8 *st,I64 len)
{
  I64 i;
  TokenMix(len);
  if (st)
    for (i=0;i<len;i++) TokenMix(st[i]);
}

U0 TokenState(CCmpCtrl *cc,I64 lines)
{
  CLexFile *tmpf;
  TokenMix(cc->token);
  TokenMix(cc->flags);
  TokenMix(cc->cur_i64);
  TokenMix(cc->cur_f64(U64));
  TokenStr(cc->cur_str,cc->cur_str_len);
  TokenMix(cc->last_U16);
  TokenMix(cc->last_line_num);
  TokenMix(cmp.compiled_lines-lines);
  TokenMix(cc->error_cnt);
  TokenMix(cc->warning_cnt);
  TokenMix(!!cc->local_var_entry);
  if (cc->local_var_entry) TokenMix(cc->local_var_entry->use_cnt);
  TokenMix(!!cc->hash_entry);
  if (cc->hash_entry) {
    TokenMix(cc->hash_entry->type);
    TokenMix(cc->hash_entry->use_cnt);
  }
  tmpf=cc->lex_include_stk;
  if (tmpf && tmpf->buf) {
    TokenMix(cc->cur_buf_ptr-tmpf->buf);
    TokenMix(tmpf->line_start-tmpf->buf);
  }
  for (;tmpf;tmpf=tmpf->next) {
    TokenMix(tmpf->flags);
    TokenMix(tmpf->line_num);
    TokenMix(tmpf->depth);
    TokenMix(tmpf->last_U16);
  }
  TokenMix(-1);
  token_steps++;
}

U0 TokenRun(U8 *src,I64 flags=0,CHashTable *table=NULL,
	CHashFun *fun=NULL)
{
  I64 tk,lines=cmp.compiled_lines,cnt=0;
  CCmpCtrl *cc=CmpCtrlNew(src,flags|CCF_DONT_FREE_BUF,"C:/Token.HC");
  cc->htc.hash_table_lst=table;
  cc->htc.local_var_lst=fun;
  try {
    do {
      tk=Lex(cc);
      TokenState(cc,lines);
      if (++cnt>4096) throw('TokenEnd');
    } while (tk);
  } catch {
    CmpCtrlDel(cc);
    cc=NULL;
  }
  CmpCtrlDel(cc);
  token_cases++;
}

U0 TokenGroup(U8 *name)
{
  "Token:%s:%016X:%d:%d\n",name,token_hash,token_cases,token_steps;
  token_hash=14695981039346656037;
  token_cases=token_steps=0;
}

U0 TokenDefines()
{
  CHashTable *table=HashTableNew(16);
  CHashDefineStr *tmpd;
  CHashFun fun;
  CMemberLst member;
  MemSet(&fun,0,sizeof(CHashFun));
  MemSet(&member,0,sizeof(CMemberLst));
  member.str="VALUE";
  fun.member_lst_and_root=&member;
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->str=StrNew("VALUE");
  tmpd->data=StrNew("17+NEXT");
  tmpd->type=HTT_DEFINE_STR;
  HashAdd(tmpd,table);
  tmpd=CAlloc(sizeof(CHashDefineStr));
  tmpd->str=StrNew("NEXT");
  tmpd->data=StrNew("\"inside\" 0x42");
  tmpd->type=HTT_DEFINE_STR;
  HashAdd(tmpd,table);
  TokenRun("VALUE VALUE NEXT;",0,table);
  TokenRun("VALUE NEXT;",CCF_NO_DEFINES,table);
  TokenRun("VALUE NEXT;",0,table,&fun);
  TokenMix(member.use_cnt);
  HashTableDel(table);
  TokenGroup("defines");
}

U0 LexToken()
{
  I64 i,j,flags;
  U8 buf[1024],*src;
  token_hash=14695981039346656037;
  token_cases=token_steps=0;
  TokenMix(sizeof(char_bmp_dec_numeric));
  for (i=0;i<16;i++) TokenMix(char_bmp_dec_numeric[i]);
  TokenRun("TX+T;DA+P+TRM+T+DL+DRT;CM+LE+RE;AN+T;LK+L+UL+T;"
	"MA+X+UL+T;MU+X+UL+T;BT+X+B+T;CB+CA+P+T+DRT;LS+LS+P+T+DRT;"
	"HX+P+Z;TR+TR+C+CA+UL+T;SP+T;IB+T;IS+T;SO+T;HC+T;");
  TokenGroup("document-defaults");
  src="a@b @one _X A0 0 123 0X1Ab 9xAF 0b101 0B 1..2 1...3 "
	".5 1.25 2e-3 1e+2 7. 9e 12.5e-1 + - * / % & | ^ ~ ! = "
	"== != <= >= << >> <<= >>= ++ -- += -= *= /= %= &= |= ^= "
	"'A' 'BC' "
	"&& || ^^ -> :: : ; , ? ( ) [ ] { } . .. ... \n\r"
	"//line\n A /*outer /*inner*/ end*/ B\n";
  for (i=0;i<32;i++) {
    flags=0;
    if (i&1) flags|=CCF_KEEP_NEW_LINES;
    if (i&2) flags|=CCF_KEEP_DOT;
    if (i&4) flags|=CCF_KEEP_AT_SIGN;
    if (i&8) flags|=CCF_NO_CHAR_CONST;
    if (i&16) flags|=CCF_KEEP_SIGN_NUM;
    TokenMix(flags);
    TokenRun(src,flags);
  }
  TokenGroup("tokens-flags");
  TokenRun("\"\" \"abc\" \"A\\0B\\nC\\x41\\X4z\\q\" "
	"'A' 'ABCDEFGH' '\\n\\r\\t\\d\\0' '\\x41\\X4z' '\\q'");
  TokenRun("\"unterminated");
  TokenRun("'unter");
  TokenRun("/*unterminated /*nested");
  TokenRun("//unterminated");
  TokenRun("#1 #abc",CCF_KEEP_SIGN_NUM);
  TokenRun("\dGREEN\d x \d\d y \d");
  TokenRun("\dunterminated");
  for (i=0;i<=576;i+=72) {
    buf[0]='\"';
    for (j=0;j<i;j++) buf[j+1]='A'+j%26;
    buf[i+1]='\"';
    buf[i+2]=0;
    TokenRun(buf);
  }
  TokenGroup("strings-eof");
  for (i=128;i<256;i++) {
    buf[0]=i;
    buf[1]='1';
    buf[2]=' ';
    buf[3]=i;
    buf[4]=0;
    TokenRun(buf);
  }
  for (i=1;i<32;i++) {
    buf[0]=i;
    buf[1]='A';
    buf[2]=0;
    TokenRun(buf);
  }
  TokenGroup("byte-classes");
  TokenDefines;
}

LexToken;
