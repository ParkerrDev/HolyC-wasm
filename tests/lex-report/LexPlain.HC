U0 LexPlain()
{
  CCmpCtrl cc;
  CLexFile file;
  MemSet(&cc,0,sizeof(CCmpCtrl));
  MemSet(&file,0,sizeof(CLexFile));
  cc.lex_include_stk=&file;
  cc.cur_str="hello";
  cc.cur_i64=42;
  cc.cur_f64=1.25;
  cc.token=TK_IDENT;
  LexPutToken(&cc);
  cc.token=TK_I64;
  LexPutToken(&cc);
  cc.token=TK_CHAR_CONST;
  LexPutToken(&cc);
  cc.token=TK_F64;
  LexPutToken(&cc);
  cc.token='\n';
  LexPutToken(&cc);
  cc.token='+';
  LexPutToken(&cc);
  cc.token=0;
  LexPutToken(&cc);
  '\n';
  LexPutLine(&cc,"abc\r\ndef");
  LexPutLine(&cc,NULL);
  LexPutLine(&cc,"");
  LexPutLine(&cc,"last");
}

LexPlain;
