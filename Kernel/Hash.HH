
public class CHash
{//See $LK,"Hash",A="HI:Hash"$
  CHash	*next;
  U8	*str;
  U32	type,
	use_cnt;
};

public class CHashTable
{
  CHashTable *next;
  I64	mask,locked_flags;
  CHash	**body;
};

//Hash table types: $LK,"ST_HTT_TYPES",A="FF:::/Kernel/KDefine.HC,ST_HTT_TYPES"$
#define HTt_EXPORT_SYS_SYM	0
#define HTt_IMPORT_SYS_SYM	1
#define HTt_DEFINE_STR		2
#define HTt_GLBL_VAR		3
#define HTt_CLASS		4
#define HTt_INTERNAL_TYPE	5
#define HTt_FUN			6
#define HTt_WORD		7
#define HTt_DICT_WORD		8
#define HTt_KEYWORD		9
#define HTt_ASM_KEYWORD		10
#define HTt_OPCODE		11
#define HTt_REG			12
#define HTt_FILE		13
#define HTt_MODULE		14
#define HTt_HELP_FILE		15
#define HTt_FRAME_PTR		16
#define HTt_TYPES_NUM		17

#define HTf_PRIVATE		23
#define HTf_PUBLIC		24
#define HTf_EXPORT		25
#define HTf_IMPORT		26
#define HTf_IMM			27
#define HTf_GOTO_LABEL		28
#define HTf_RESOLVED		29
#define HTf_UNRESOLVED		30
#define HTf_LOCAL		31

#define HTT_INVALID		0
#define HTT_EXPORT_SYS_SYM	0x00001 //CHashExport
#define HTT_IMPORT_SYS_SYM	0x00002 //CHashImport
#define HTT_DEFINE_STR		0x00004 //CHashDefineStr
#define HTT_GLBL_VAR		0x00008 //CHashGlblVar
#define HTT_CLASS		0x00010 //CHashClass
#define HTT_INTERNAL_TYPE	0x00020 //CHashClass
#define HTT_FUN			0x00040 //CHashFun
#define HTT_WORD		0x00080 //CHashAC only in AutoComplete table
#define HTT_DICT_WORD		0x00100 //CHashGeneric only in AutoComplete tbl
#define HTT_KEYWORD		0x00200 //CHashGeneric $LK,"KEYWORD",A="FF:::/Compiler/OpCodes.DD,KEYWORD"$
#define HTT_ASM_KEYWORD		0x00400 //CHashGeneric $LK,"ASM_KEYWORD",A="FF:::/Compiler/OpCodes.DD,ASM_KEYWORD"$
#define HTT_OPCODE		0x00800 //CHashOpcode
#define HTT_REG			0x01000 //CHashReg
#define HTT_FILE		0x02000 //CHashGeneric
#define HTT_MODULE		0x04000 //CHashGeneric
#define HTT_HELP_FILE		0x08000 //CHashSrcSym
#define HTT_FRAME_PTR		0x10000 //CHashGeneric
#define HTG_TYPE_MASK		0x1FFFF

#define HTF_PRIVATE		0x00800000
#define HTF_PUBLIC		0x01000000
#define HTF_EXPORT		0x02000000
#define HTF_IMPORT		0x04000000
#define HTF_IMM			0x08000000
#define HTF_GOTO_LABEL		0x10000000
#define HTF_RESOLVE		0x20000000
#define HTF_UNRESOLVED		0x40000000
#define HTF_LOCAL		0x80000000
#define HTG_FLAGS_MASK		0xFF000000

#define HTG_SRC_SYM	(HTT_DEFINE_STR|HTT_GLBL_VAR|HTT_FUN|HTT_CLASS|\
			HTT_EXPORT_SYS_SYM|HTT_HELP_FILE)
#define HTG_ALL 		-1

#define KERNEL_MODULE_NAME	"/Kernel/Kernel"

public class CHashGeneric:CHash
{
  I64 user_data0,user_data1,user_data2;
};

extern class CAOTImportExport;
class CDbgInfo
{
  U32	min_line,max_line;
  U32	body[1]; //Code heap is 32-bit value
};

public class CHashSrcSym:CHash
{
  U8 *src_link,*idx;
  CDbgInfo *dbg_info;
  U8 *import_name;
  CAOTImportExport *ie_lst;
};

public class CHashAC:CHash
{
  I32	num;
  U32	hits;
};

public class CHashExport:CHashSrcSym
{
  I64 val;
};

public class CHashDefineStr:CHashSrcSym
{
  U8 *data,**sub_idx;
  I64 cnt;
};

#define TASK_HASH_TABLE_SIZE (1<<10)
