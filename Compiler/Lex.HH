
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
