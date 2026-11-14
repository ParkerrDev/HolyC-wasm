
extern class CHashClass;
extern class CHashFun;
#define PTR_STARS_NUM	4

//Member Lst Flags
#define MLF_DFT_AVAILABLE	1
#define MLF_LASTCLASS		2
#define MLF_STR_DFT_AVAILABLE	4
#define MLF_FUN			8
#define MLF_DOT_DOT_DOT		16
#define MLF_NO_UNUSED_WARN	32
#define MLF_STATIC		64

public class CArrayDim
{
  CArrayDim *next;
  I64	cnt,total_cnt;
};

#define MLMF_IS_STR	1
public class CMemberLstMeta
{
  CMemberLstMeta *next;
  U8	*str;
  I64	flags,
	user_data;
};

public class CMemberLst
{
  CMemberLst *next,*left,*right,
	*left_class_base,*right_class_base; //For finding dup class local vars.
  U8	*str;
  CHashClass *member_class,*member_class_base;
  CMemberLstMeta *meta;
  U32	use_cnt;
  U16	flags;
  I8	reg,pad;
  I64	offset,size;
  CArrayDim dim;
  U8	*static_data;
  union {
    I64	static_data_rip;
    I64 dft_val;
  }
  CHashFun *fun_ptr;
};

class CExternUsage
{
  CExternUsage *next;
  I64	rip;
};

#define Cf_EXTERN		0
#define Cf_INTERNAL_TYPE	1

public class CHashClass:CHashSrcSym
{//See $LK,"PrsClassNew",A="MN:PrsClassNew"$(). base_class of $LK,"CHashFun",A="MN:CHashFun"$
  I64	size,neg_offset;
  U32	member_cnt;
  U8	ptr_stars_cnt,raw_type;
  U16	flags;
  CMemberLst *member_lst_and_root, //Head of linked list and head of tree.
	*member_class_base_root, //For finding dup class local vars.
	*last_in_member_lst;
  CHashClass	*base_class,
	*fwd_class;
};

//Function flags
#define Ff_INTERRUPT		8
#define Ff_HASERRCODE		9
#define Ff_ARGPOP		10
#define Ff_NOARGPOP		11
#define Ff_INTERNAL		12
#define Ff__EXTERN		13
#define Ff_DOT_DOT_DOT		14
#define Ff_RET1			15

public class CHashFun:CHashClass
{//See $LK,"PrsFunNew",A="MN:PrsFunNew"$().
  CHashClass *return_class;
  U32	arg_cnt,pad,
	used_reg_mask,clobbered_reg_mask;
  U8	*exe_addr;
  CExternUsage *ext_lst;
};
