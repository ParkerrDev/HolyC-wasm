//Native CmpFillTables values; compiler boot and symbol graphs remain absent.
export const CMP_TABLE_TYPES_SRC=String.raw`
#define REG_REGS_NUM	16
#define REGG_LOCAL_VARS		0xCCC0 //RSI,RDI,R10,R11,R14,R15
#define REGG_LOCAL_NON_PTR_VARS	0x3000 //R12,R13
#define TK_SUPERSCRIPT	0x001
#define TK_SUBSCRIPT	0x002
#define TK_NORMALSCRIPT	0x003
#define TK_IDENT	0x100
#define TK_STR		0x101
#define TK_I64		0x102
#define TK_CHAR_CONST	0x103
#define TK_F64		0x104
#define TK_PLUS_PLUS	0x105
#define TK_MINUS_MINUS	0x106
#define TK_DEREFERENCE	0x107
#define TK_DBL_COLON	0x108
#define TK_SHL		0x109
#define TK_SHR		0x10A
#define TK_EQU_EQU	0x10B
#define TK_NOT_EQU	0x10C
#define TK_LESS_EQU	0x10D
#define TK_GREATER_EQU	0x10E
#define TK_AND_AND	0x10F
#define TK_OR_OR	0x110
#define TK_XOR_XOR	0x111
#define TK_SHL_EQU	0x112
#define TK_SHR_EQU	0x113
#define TK_MUL_EQU	0x114
#define TK_DIV_EQU	0x115
#define TK_AND_EQU	0x116
#define TK_OR_EQU	0x117
#define TK_XOR_EQU	0x118
#define TK_ADD_EQU	0x119
#define TK_SUB_EQU	0x11A
#define TK_IF		0x11B
#define TK_IFDEF	0x11C
#define TK_IFNDEF	0x11D
#define TK_IFAOT	0x11E
#define TK_IFJIT	0x11F
#define TK_ENDIF	0x120
#define TK_ELSE		0x121
#define TK_MOD_EQU	0x122
#define TK_DOT_DOT	0x123
#define TK_ELLIPSIS	0x124
#define TK_INS_BIN	0x125
#define TK_INS_BIN_SIZE 0x126
#define TK_TKS_NUM	0x127
#define IC_SHL			0x2B
#define IC_SHR			0x2C
#define IC_POWER		0x2F
#define IC_MUL			0x30
#define IC_DIV			0x31
#define IC_MOD			0x32
#define IC_AND			0x33
#define IC_OR			0x34
#define IC_XOR			0x35
#define IC_ADD			0x36
#define IC_SUB			0x37
#define IC_EQU_EQU		0x3A
#define IC_NOT_EQU		0x3B
#define IC_LESS			0x3C
#define IC_GREATER_EQU		0x3D
#define IC_GREATER		0x3E
#define IC_LESS_EQU		0x3F
#define IC_AND_AND		0x41
#define IC_OR_OR		0x42
#define IC_XOR_XOR		0x43
#define IC_ASSIGN		0x44
#define IC_SHL_EQU		0x47
#define IC_SHR_EQU		0x48
#define IC_MUL_EQU		0x49
#define IC_DIV_EQU		0x4A
#define IC_MOD_EQU		0x4B
#define IC_AND_EQU		0x4C
#define IC_OR_EQU		0x4D
#define IC_XOR_EQU		0x4E
#define IC_ADD_EQU		0x4F
#define IC_SUB_EQU		0x50
#define ASSOCF_LEFT	1
#define ASSOCF_RIGHT	2
#define PREC_EXP		0x10
#define PREC_MUL		0x14
#define PREC_AND		0x18
#define PREC_XOR		0x1C
#define PREC_OR			0x20
#define PREC_ADD		0x24
#define PREC_CMP		0x28
#define PREC_CMP2		0x2C
#define PREC_AND_AND		0x30
#define PREC_XOR_XOR		0x34
#define PREC_OR_OR		0x38
#define PREC_ASSIGN		0x3C
`;

export const CMP_TABLE_SRC=String.raw`
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
`;
