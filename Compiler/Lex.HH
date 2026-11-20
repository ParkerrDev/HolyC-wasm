
extern class CHashClass;
#define IC_BODY_SIZE 0x83
#define RT_I0 2
#define RT_U0 3
#define RT_I8 4
#define RT_U8 5
#define RT_I16 6
#define RT_U16 7
#define RT_I32 8
#define RT_U32 9
#define RT_I64 10
#define RT_PTR 10
#define RT_U64 11
#define RT_F32 12
#define RT_UF32 13
#define RT_F64 14
#define RT_UF64 15
#define RT_RTS_NUM 16

U16 class CICType
{
  U8	raw_type,mode;
};

class CICArg
{
  CICType type;
  U16	reg; //Low is register, high is index register and scale.
  I64	disp;
};

class CICTreeLinks
{
  CHashClass *arg1_class,*arg2_class;
  CIntermediateCode *arg1_tree,*arg2_tree;
  CHashClass *class2;
};

class CIntermediateCode:CIntermediateCodeBase
{
  I64	ic_flags,
	ic_data,
	ic_line;
  CHashClass *ic_class,*ic_class2;
  CICArg arg1,arg2,res;
  U8	arg1_type_pointed_to;
  union {
    U8 ic_body[IC_BODY_SIZE];
    CICTreeLinks t;
  };
};

public class CCmpGlbls
{
  CHashTable *asm_hash;
  CHashClass *internal_types[RT_RTS_NUM];
  CIntermediateCode ic_nop;
  U32	*dual_U16_tokens1,*dual_U16_tokens2,*dual_U16_tokens3,
	*binary_ops;
  I64	num_reg_vars,num_non_ptr_vars,
	stk_tmps_mask,reg_vars_mask,non_ptr_vars_mask;
  U8	*to_reg_vars_map,*non_ptr_vars_map;
  I64	size_arg_mask[9],
	compiled_lines;
};

#define OPTf_ECHO 0
#define OPTF_ECHO (1<<OPTf_ECHO)
#define TK_EOF 0

//V5.03 Compiler/CompilerA.HH: the keywords' user_data0.
#define KW_INCLUDE	0
#define KW_DEFINE	1
#define KW_UNION	2
#define KW_CATCH	3
#define KW_CLASS	4
#define KW_TRY		5
#define KW_IF		6
#define KW_ELSE		7
#define KW_FOR		8
#define KW_WHILE	9
#define KW_EXTERN	10
#define KW__EXTERN	11
#define KW_RETURN	12
#define KW_SIZEOF	13
#define KW__INTERN	14
#define KW_DO		15
#define KW_ASM		16
#define KW_GOTO		17
#define KW_EXE		18
#define KW_BREAK	19
#define KW_SWITCH	20
#define KW_START	21
#define KW_END		22
#define KW_CASE		23
#define KW_DFT		24
#define KW_PUBLIC	25
#define KW_OFFSET	26
#define KW_IMPORT	27
#define KW__IMPORT	28
#define KW_IFDEF	29
#define KW_IFNDEF	30
#define KW_IFAOT	31
#define KW_IFJIT	32
#define KW_ENDIF	33
#define KW_ASSERT	34
#define KW_REG		35
#define KW_NOREG	36
#define KW_LASTCLASS	37
#define KW_NO_WARN	38
#define KW_HELP_INDEX	39
#define KW_HELP_FILE	40
#define KW_STATIC	41
#define KW_LOCK		42
#define KW_DEFINED	43
#define KW_INTERRUPT	44
#define KW_HASERRCODE	45
#define KW_ARGPOP	46
#define KW_NOARGPOP	47

#define AKW_ALIGN	64
#define AKW_ORG		65
#define AKW_I0		66
#define AKW_I8		67
#define AKW_I16		68
#define AKW_I32		69
#define AKW_I64		70
#define AKW_U0		71
#define AKW_U8		72
#define AKW_U16		73
#define AKW_U32		74
#define AKW_U64		75
#define AKW_F64		76
#define AKW_DU8		77
#define AKW_DU16	78
#define AKW_DU32	79
#define AKW_DU64	80
#define AKW_DUP		81
#define AKW_USE16	82
#define AKW_USE32	83
#define AKW_USE64	84
#define AKW_IMPORT	85
#define AKW_LIST	86
#define AKW_NOLIST	87
#define AKW_BINFILE	88
#define KW_KWS_NUM	89

#define CMPF_PRS_SEMICOLON	8 //V5.03 Compiler/CompilerA.HH.
