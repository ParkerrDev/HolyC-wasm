
U0 CmpTablesHostInit()
{//Publish the six native tables only after all allocations succeed.
  I64 i;
  U32 *d;
  CCmpGlbls tmpc;
  if (cmp.dual_U16_tokens1) return;
  MemSet(&tmpc,0,sizeof(CCmpGlbls));
  try {
    tmpc.to_reg_vars_map=ACAlloc(REG_REGS_NUM*sizeof(U8));
    tmpc.num_reg_vars=0;
    tmpc.reg_vars_mask=REGG_LOCAL_VARS;
    for (i=0;i<REG_REGS_NUM;i++)
      if (Bt(&tmpc.reg_vars_mask,i))
	tmpc.to_reg_vars_map[tmpc.num_reg_vars++]=i;

    tmpc.non_ptr_vars_map=ACAlloc(REG_REGS_NUM*sizeof(U8));
    tmpc.num_non_ptr_vars=0;
    tmpc.non_ptr_vars_mask=REGG_LOCAL_NON_PTR_VARS;
    for (i=0;i<REG_REGS_NUM;i++)
      if (Bt(&tmpc.non_ptr_vars_mask,i))
	tmpc.non_ptr_vars_map[tmpc.num_non_ptr_vars++]=i;

    tmpc.dual_U16_tokens1=d=ACAlloc(sizeof(U32)*TK_TKS_NUM);
    d['!']=TK_NOT_EQU<<16+'=';
    d['&']=TK_AND_AND<<16+'&';
    d['*']=TK_MUL_EQU<<16+'=';
    d['+']=TK_PLUS_PLUS<<16+'+';
    d['-']=TK_DEREFERENCE<<16+'>';
    d['/']='*';
    d[':']=TK_DBL_COLON<<16+':';
    d['<']=TK_LESS_EQU<<16+'=';
    d['=']=TK_EQU_EQU<<16+'=';
    d['>']=TK_GREATER_EQU<<16+'=';
    d['^']=TK_XOR_EQU<<16+'=';
    d['|']=TK_OR_OR<<16+'|';
    d['%']=TK_MOD_EQU<<16+'=';

    tmpc.dual_U16_tokens2=d=ACAlloc(sizeof(U32)*TK_TKS_NUM);
    d['&']=TK_AND_EQU<<16+'=';
    d['+']=TK_ADD_EQU<<16+'=';
    d['-']=TK_MINUS_MINUS<<16+'-';
    d['/']='/';
    d['<']=TK_SHL<<16+'<';
    d['>']=TK_SHR<<16+'>';
    d['^']=TK_XOR_XOR<<16+'^';
    d['|']=TK_OR_EQU<<16+'=';

    tmpc.dual_U16_tokens3=d=ACAlloc(sizeof(U32)*TK_TKS_NUM);
    d['-']=TK_SUB_EQU<<16+'=';
    d['/']=TK_DIV_EQU<<16+'=';

    tmpc.binary_ops=d=ACAlloc(sizeof(U32)*TK_TKS_NUM);
    d['\`']   =(PREC_EXP+ASSOCF_RIGHT)<<16+IC_POWER;
    d[TK_SHL]=(PREC_EXP+ASSOCF_LEFT)<<16+IC_SHL;
    d[TK_SHR]=(PREC_EXP+ASSOCF_LEFT)<<16+IC_SHR;

    d['*']=PREC_MUL<<16+IC_MUL;
    d['/']=(PREC_MUL+ASSOCF_LEFT)<<16+IC_DIV;
    d['%']=(PREC_MUL+ASSOCF_LEFT)<<16+IC_MOD;

    d['&']=PREC_AND<<16+IC_AND;

    d['^']=PREC_XOR<<16+IC_XOR;

    d['|']=PREC_OR<<16+IC_OR;

    d['+']=PREC_ADD<<16+IC_ADD;
    d['-']=(PREC_ADD+ASSOCF_LEFT)<<16+IC_SUB;

    d['<']		=PREC_CMP<<16+IC_LESS;
    d['>']		=PREC_CMP<<16+IC_GREATER;
    d[TK_LESS_EQU]	=PREC_CMP<<16+IC_LESS_EQU;
    d[TK_GREATER_EQU]	=PREC_CMP<<16+IC_GREATER_EQU;

    d[TK_EQU_EQU]	=PREC_CMP2<<16+IC_EQU_EQU;
    d[TK_NOT_EQU]	=PREC_CMP2<<16+IC_NOT_EQU;

    d[TK_AND_AND]	=PREC_AND_AND<<16+IC_AND_AND;

    d[TK_XOR_XOR]	=PREC_XOR_XOR<<16+IC_XOR_XOR;

    d[TK_OR_OR]	=PREC_OR_OR<<16+IC_OR_OR;

    d['=']	 =(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_ASSIGN;
    d[TK_SHL_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_SHL_EQU;
    d[TK_SHR_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_SHR_EQU;
    d[TK_MUL_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_MUL_EQU;
    d[TK_DIV_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_DIV_EQU;
    d[TK_MOD_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_MOD_EQU;
    d[TK_AND_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_AND_EQU;
    d[TK_OR_EQU] =(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_OR_EQU;
    d[TK_XOR_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_XOR_EQU;
    d[TK_ADD_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_ADD_EQU;
    d[TK_SUB_EQU]=(PREC_ASSIGN+ASSOCF_RIGHT)<<16+IC_SUB_EQU;
  } catch {
    Free(tmpc.to_reg_vars_map);
    Free(tmpc.non_ptr_vars_map);
    Free(tmpc.dual_U16_tokens1);
    Free(tmpc.dual_U16_tokens2);
    Free(tmpc.dual_U16_tokens3);
    Free(tmpc.binary_ops);
  }
  cmp.to_reg_vars_map=tmpc.to_reg_vars_map;
  cmp.num_reg_vars=tmpc.num_reg_vars;
  cmp.reg_vars_mask=tmpc.reg_vars_mask;
  cmp.non_ptr_vars_map=tmpc.non_ptr_vars_map;
  cmp.num_non_ptr_vars=tmpc.num_non_ptr_vars;
  cmp.non_ptr_vars_mask=tmpc.non_ptr_vars_mask;
  cmp.dual_U16_tokens1=tmpc.dual_U16_tokens1;
  cmp.dual_U16_tokens2=tmpc.dual_U16_tokens2;
  cmp.dual_U16_tokens3=tmpc.dual_U16_tokens3;
  cmp.binary_ops=tmpc.binary_ops;
}
