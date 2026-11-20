
CCmpGlbls cmp;

U0 CmpLexHostInit()
{//Only lexical state is available; compiler-owned graphs remain absent.
  MemSet(&cmp,0,sizeof(CCmpGlbls));
}

//V5.03 Compiler/AsmInit.HC reads ::/Compiler/OpCodes.DD into cmp.asm_hash
//and puts it after Adam's hash table. Its KEYWORD and ASM_KEYWORD lines,
//all the browser's Lex needs of it (an opcode needs the assembler). KMain
//runs AsmInit; here CmpKeyWordsLoad is a runtime initializer (src/prelude.js)
//of a program whose Lex looks names up.
U8 *cmp_key_words=
  "KEYWORD include\t\t0;\n"
  "KEYWORD define\t\t1;\n"
  "KEYWORD union\t\t2;\n"
  "KEYWORD catch\t\t3;\n"
  "KEYWORD class\t\t4;\n"
  "KEYWORD try\t\t5;\n"
  "KEYWORD if\t\t6;\n"
  "KEYWORD else\t\t7;\n"
  "KEYWORD for\t\t8;\n"
  "KEYWORD while\t\t9;\n"
  "KEYWORD extern\t\t10;\n"
  "KEYWORD _extern\t\t11;\n"
  "KEYWORD return\t\t12;\n"
  "KEYWORD sizeof\t\t13;\n"
  "KEYWORD _intern\t\t14;\n"
  "KEYWORD do\t\t15;\n"
  "KEYWORD asm\t\t16;\n"
  "KEYWORD goto\t\t17;\n"
  "KEYWORD exe\t\t18;\n"
  "KEYWORD break\t\t19;\n"
  "KEYWORD switch\t\t20;\n"
  "KEYWORD start \t\t21;\n"
  "KEYWORD end  \t\t22;\n"
  "KEYWORD case\t\t23;\n"
  "KEYWORD default\t\t24;\n"
  "KEYWORD public\t\t25;\n"
  "KEYWORD offset\t\t26;\n"
  "KEYWORD import\t\t27;\n"
  "KEYWORD _import\t\t28;\n"
  "KEYWORD ifdef\t\t29;\n"
  "KEYWORD ifndef\t\t30;\n"
  "KEYWORD ifaot\t\t31;\n"
  "KEYWORD ifjit\t\t32;\n"
  "KEYWORD endif\t\t33;\n"
  "KEYWORD assert\t\t34;\n"
  "KEYWORD reg\t\t35;\n"
  "KEYWORD noreg\t\t36;\n"
  "KEYWORD lastclass\t37;\n"
  "KEYWORD no_warn\t38;\n"
  "KEYWORD help_index\t39;\n"
  "KEYWORD help_file\t40;\n"
  "KEYWORD static\t\t41;\n"
  "KEYWORD lock\t\t42;\n"
  "KEYWORD defined\t\t43;\n"
  "KEYWORD interrupt\t44;\n"
  "KEYWORD haserrcode\t45;\n"
  "KEYWORD argpop\t\t46;\n"
  "KEYWORD noargpop\t47;\n"
  "ASM_KEYWORD ALIGN\t64;\n"
  "ASM_KEYWORD ORG\t\t65;\n"
  "ASM_KEYWORD I0\t\t66;\n"
  "ASM_KEYWORD I8\t\t67;\n"
  "ASM_KEYWORD I16\t\t68;\n"
  "ASM_KEYWORD I32\t\t69;\n"
  "ASM_KEYWORD I64\t\t70;\n"
  "ASM_KEYWORD U0\t\t71;\n"
  "ASM_KEYWORD U8\t\t72;\n"
  "ASM_KEYWORD U16\t\t73;\n"
  "ASM_KEYWORD U32\t\t74;\n"
  "ASM_KEYWORD U64\t\t75;\n"
  "ASM_KEYWORD F64\t\t76;\n"
  "ASM_KEYWORD DU8\t\t77;\n"
  "ASM_KEYWORD DU16\t78;\n"
  "ASM_KEYWORD DU32\t79;\n"
  "ASM_KEYWORD DU64\t80;\n"
  "ASM_KEYWORD DUP\t\t81;\n"
  "ASM_KEYWORD USE16\t82;\n"
  "ASM_KEYWORD USE32\t83;\n"
  "ASM_KEYWORD USE64\t84;\n"
  "ASM_KEYWORD IMPORT\t85;\n"
  "ASM_KEYWORD LIST\t86;\n"
  "ASM_KEYWORD NOLIST\t87;\n"
  "ASM_KEYWORD BINFILE\t88;\n";

U0 CmpKeyWordsLoad()
{//V5.03 AsmInit's KEYWORD and ASM_KEYWORD cases.
  I64 i;
  CHashGeneric *tmph;
  CCmpCtrl *cc=CmpCtrlNew(cmp_key_words,CCF_DONT_FREE_BUF);
  cmp.asm_hash=HashTableNew(1024);
  Lex(cc);
  while (cc->token!=TK_EOF) {
    if (cc->token!=TK_IDENT)
      LexExcept(cc,"Expecting identifier at ");
    i=LstMatch(cc->cur_str,"KEYWORD\0ASM_KEYWORD\0");
    if (i<0)
      LexExcept(cc,"Unknown Stmt");
    Lex(cc); //skip keyword stmt
    tmph=CAlloc(sizeof(CHashGeneric));
    tmph->str=cc->cur_str;
    cc->cur_str=NULL;
    Lex(cc); //skip keyword name
    if (cc->token!=TK_I64)
      LexExcept(cc,"Expecting int at ");
    tmph->user_data0=cc->cur_i64;
    if (!i)
      tmph->type=HTT_KEYWORD;
    else
      tmph->type=HTT_ASM_KEYWORD;
    HashAdd(tmph,cmp.asm_hash);
    Lex(cc); //Skip INT
    if (cc->token!=';')
      LexExcept(cc,"Missing ';' at");
    Lex(cc); //Skip ';'
  }
  CmpCtrlDel(cc);
  adam_task->hash_table->next=cmp.asm_hash;
}
