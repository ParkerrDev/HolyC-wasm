//V5.03 Compiler/PrsExp.HC compiles an expression to machine code and
//calls it. The browser's compiler is in the host, so Lex hands it the
//expression's tokens and the code stays there: the bin holds its handle.

U8 *LexExpression2Bin(CCmpCtrl *cc,I64 *_type=NULL)
{//Compile cc expression. You call the code.
  I64 depth=0,*res;
  while (TRUE) {
    switch (cc->token) {
      case TK_EOF:
	goto le_done;
      case '(':
      case '[':
	depth++;
	break;
      case ')':
      case ']':
	if (!depth) goto le_done;
	depth--;
	break;
      case ',':
      case ';':
      case ':':
      case '{':
      case '}':
	if (!depth) goto le_done;
	break;
    }
    __jit_tok(cc->token,cc->cur_i64,cc->cur_f64,cc->cur_str,cc->cur_str_len);
    Lex(cc);
  }
le_done:
  res=MAlloc(sizeof(I64));
  if (!(*res=__jit_expr(_type))) {
    Free(res);
    LexExcept(cc,"Invalid expression at ");
  }
  return res;
}

I64 LexExpressionCall(U8 *machine_code)
{//Run $LK,"LexExpression2Bin",A="MN:LexExpression2Bin"$ code, as Call.
  return __jit_call(*machine_code(I64 *));
}

U0 LexExpressionFree(U8 *machine_code)
{//Free $LK,"LexExpression2Bin",A="MN:LexExpression2Bin"$ code.
  if (machine_code) {
    __jit_del(*machine_code(I64 *));
    Free(machine_code);
  }
}

Bool IsLexExpression2Bin(CCmpCtrl *cc,U8 **_machine_code)
{//Compile cc expression to bin. Return err status.
  return ToBool(*_machine_code=LexExpression2Bin(cc));
}

I64 LexExpressionI64(CCmpCtrl *cc)
{//Compile cc expression, forcing to I64 and eval.
  U8 *machine_code;
  I64 res,type;
  if (machine_code=LexExpression2Bin(cc,&type)) {
    res=LexExpressionCall(machine_code);
    LexExpressionFree(machine_code);
    if (type==RT_F64)
      res=ToI64(res(F64));
  } else
    res=0;
  return res;
}

F64 LexExpressionF64(CCmpCtrl *cc)
{//Compile cc expression, forcing to F64 and eval.
  U8 *machine_code;
  I64 res,type;
  if (machine_code=LexExpression2Bin(cc,&type)) {
    res=LexExpressionCall(machine_code);
    LexExpressionFree(machine_code);
    if (type!=RT_F64)
      res(F64)=ToF64(res);
  } else
    res=0;
  return res(F64);
}

I64 LexExpression(CCmpCtrl *cc)
{//Compile cc expression and eval.  Might be I64 or F64.
  U8 *machine_code;
  I64 res;
  if (machine_code=LexExpression2Bin(cc)) {
    res=LexExpressionCall(machine_code);
    LexExpressionFree(machine_code);
  } else
    res=0;
  return res;
}
