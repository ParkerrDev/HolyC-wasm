//Native compiler-control and finite byte-buffer ownership.
export const CMP_TYPES_SRC=String.raw`
extern class CHashFun;
extern class CAsmUndefHash;
extern class CMemberLst;
extern class CCodeMisc;
extern class CAOT;
extern class CAOTCtrl;
extern class CIntermediateCode;

class CPrsStk
{
  I64	ptr,
	stk[255],
	ptr2,
	stk2[255];
};

I64 class CAbsCntsI64
{
  U16	abs_addres, //Only odd/even matters. Cnt of absolute addres in an exp.
	c_addres; //Only odd/even matters. Cnt of C addres in an exp.
  U32	externs; //Only nonzero matters. Some regions have externs banned.
};

class CIntermediateCodeBase
{
  CIntermediateCode *next,*last;
  U16	ic_code,
	ic_precedence;
  I16	ic_cnt,
	ic_last_start;
};

class CStreamBlk
{
  CStreamBlk *next,*last;
  U8	*body;
};

class CCodeCtrl
{
  CCodeCtrl *coc_next;
  CCodeMisc *coc_next_misc,*coc_last_misc;
  CIntermediateCodeBase	coc_head;
};

#define LFSF_DOC	1
#define LFSF_DEFINE	2
class CLexFile
{
  CLexFile *next;
  U8	*buf,
	*buf_ptr;
  I64	line_num,flags;
  U8	*full_name,
	*line_start;
  CDoc	*doc;
  CDocEntry *cur_entry;
  I32	depth;
  U8	last_U16,pad[3];
};

class CLexHashTableContext
{
  CLexHashTableContext *next;
  I64	old_flags,hash_mask;
  CHashFun *local_var_lst,
	*fun;
  CHashTable *hash_table_lst,
	*define_hash_table,
	*local_hash_table,
	*glbl_hash_table;
};

//CmpCtrl flags
#define CCF_CMD_LINE		0x001
#define CCF_PMT			0x002
#define CCf_PMT			1
#define CCF_QUESTION_HELP	0x004
#define CCF_DONT_FREE_BUF	0x008
#define CCF_NO_DEFINES		0x010
#define CCF_IN_IF		0x020
#define CCF_JUST_LOAD		0x040
#define CCF_KEEP_NEW_LINES	0x080
#define CCF_KEEP_DOT		0x100
#define CCF_KEEP_SIGN_NUM	0x200
#define CCF_KEEP_AT_SIGN	0x400
#define CCF_NO_CHAR_CONST	0x800
#define CCf_PASS_TRACE_PRESENT	12
#define CCF_NOT_CONST		0x0000020000
#define CCF_NO_REG_OPT		0x0000040000
#define CCF_IN_QUOTES		0x0000080000
#define CCF_EXE_BLK		0x0000100000
#define CCF_HAS_MISC_DATA	0x0000200000
#define CCF_HAS_RETURN		0x0000400000
#define CCF_ASM_EXPRESSIONS	0x0000800000
#define CCF_UNRESOLVED		0x0001000000
#define CCF_LOCAL		0x0002000000
#define CCF_FUN_EXP		0x0004000000
#define CCf_FUN_EXP		26
#define CCF_POSTINC		0x0008000000
#define CCF_POSTDEC		0x0010000000
#define CCF_PREINC		0x0020000000
#define CCF_PREDEC		0x0040000000
#define CCF_ARRAY		0x0080000000
#define CCF_RAX			0x0100000000
#define CCF_USE_LAST_U16	0x0200000000
#define CCf_USE_LAST_U16	33
#define CCF_LAST_WAS_DOT	0x0400000000
#define CCF_AOT_COMPILE		0x0800000000
#define CCf_AOT_COMPILE		35
#define CCF_NO_ABSS		0x1000000000
#define CCF_PAREN		0x2000000000
#define CCf_PAREN		37
#define CCF_CLASS_DOL_OFFSET	0x4000000000
#define CCF_DONT_MAKE_RES	0x8000000000

public class CCmpCtrl
{
  CCmpCtrl *next,*last;
  I64	token,
	flags,
	cur_i64;
  F64	cur_f64;
  U8	*cur_str;
  I64	cur_str_len,
	class_dol_offset;
  U8	*dollar_buf;
  I64	dollar_cnt;
  U8	*cur_help_idx;
  I64	last_U16,
	min_line,max_line,last_line_num,
	lock_cnt;
  U32	*char_bmp_alpha_numeric;
  CLexHashTableContext htc;
  CHashGeneric *hash_entry;
  CAbsCntsI64 abs_cnts;
  CAsmUndefHash *asm_undef_hash;
  CMemberLst *local_var_entry;
  CCodeMisc *lb_leave;
  U8	*cur_buf_ptr;
  CLexFile *lex_include_stk,
	*lex_prs_stk,
	*fun_lex_file;
  CStreamBlk *next_stream_blk,*last_stream_blk;
  CAOT	*aot;

  I64	pass,opts,pass_trace,saved_pass_trace,
	error_cnt,warning_cnt;

  //For intermediate codes with multiple float ops (int<->float conversions)
  I64	cur_ic_float_op_num,last_ic_float_op_num;
  CIntermediateCode *last_float_op_ic;
  Bool	last_dont_pushable,last_dont_popable,last_float_op_pos,
	dont_push_float,pad[4];

  CCodeCtrl coc;
  CPrsStk *ps;
  CAOTCtrl *aotc;
  I64	aot_depth,pmt_line;
};

#define OPTf_WARN_UNUSED_VAR 0x10
#define OPTf_WARN_HEADER_MISMATCH 0x13
`;

export const CMP_SRC=String.raw`
U32 char_bmp_alpha_numeric[16]=
  {0,0x03FF0000,0x87FFFFFF,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0,0,0,0,0,0,0,0},
  char_bmp_alpha_numeric_no_at[16]=
  {0,0x03FF0000,0x87FFFFFE,0x07FFFFFE,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0,0,0,0,0,0,0,0};

U0 LexFileHostChk(CLexFile *tmpf)
{//Document streams need actual DolDoc lifetime support.
  while (tmpf) {
    if (tmpf->flags&LFSF_DOC) throw('LexMode');
    tmpf=tmpf->next;
  }
}

CLexFile *LexFilePush(CCmpCtrl *cc)
{//#include file push.
  CLexFile *res=CAlloc(sizeof(CLexFile));
  if (res->next=cc->lex_include_stk)
    res->depth=res->next->depth+1;
  else
    res->depth=-1;
  return cc->lex_include_stk=res;
}

CLexFile *LexFilePop(CCmpCtrl *cc)
{//#include file pop; outer borrowed buffers remain with their caller.
  CLexFile *tmpf;
  if (tmpf=cc->lex_include_stk) {
    if (tmpf->flags&LFSF_DOC) throw('LexMode');
    if ((cc->lex_include_stk=tmpf->next) || !(cc->flags&CCF_DONT_FREE_BUF))
      Free(tmpf->buf);
    Free(tmpf->full_name);
    Free(tmpf);
  }
  return cc->lex_include_stk;
}

U0 CmpCtrlDel(CCmpCtrl *cc)
{//Free compiler-control ownership, retaining borrowed hash tables.
  LexFileHostChk(cc->lex_include_stk);
  while (LexFilePop(cc));
  LinkedLstDel(cc->lex_prs_stk);
  LinkedLstDel(cc->htc.next);
  Free(cc->ps);
  Free(cc->cur_str);
  Free(cc->cur_help_idx);
  Free(cc->dollar_buf);
  Free(cc);
}

CCmpCtrl *CmpCtrlNew(U8 *buf=NULL,I64 flags=0,U8 *filename=NULL)
{//Adopt buf only after construction succeeds, unless DONT_FREE_BUF borrows it.
  CCmpCtrl *cc=NULL;
  CLexFile *tmpf;
  if (flags&CCF_PMT) throw('LexMode');
  try {
    cc=CAlloc(sizeof(CCmpCtrl));
    QueInit(cc);
    cc->flags=flags;
    cc->opts=1<<OPTf_WARN_UNUSED_VAR|1<<OPTf_WARN_HEADER_MISMATCH;
    cc->htc.hash_mask=HTG_TYPE_MASK-HTT_IMPORT_SYS_SYM;
    cc->htc.define_hash_table=cc->htc.hash_table_lst=
	cc->htc.glbl_hash_table=cc->htc.local_hash_table=Fs->hash_table;
    if (flags&CCF_KEEP_AT_SIGN)
      cc->char_bmp_alpha_numeric=char_bmp_alpha_numeric_no_at;
    else
      cc->char_bmp_alpha_numeric=char_bmp_alpha_numeric;
    tmpf=LexFilePush(cc);
    QueInit(&cc->next_stream_blk);
    if (filename)
      tmpf->full_name=FileNameAbs(filename);
    else
      tmpf->full_name=StrNew(blkdev.tmp_filename);
    tmpf->buf=tmpf->buf_ptr=tmpf->line_start=cc->cur_buf_ptr=buf;
    tmpf->line_num=1;
  } catch {
    if (cc) CmpCtrlDel(cc);
  }
  return cc;
}

I64 CmpCtrlSize(CCmpCtrl *cc)
{//Native counted fields using this backend's actual allocation spans.
  CLexFile *tmpf=cc->lex_include_stk;
  I64 res=0;
  LexFileHostChk(tmpf);
  while (tmpf) {
    if (tmpf->next || !(cc->flags&CCF_DONT_FREE_BUF))
      res+=MSize2(tmpf->buf);
    res+=MSize2(tmpf->full_name);
    res+=MSize2(tmpf);
    tmpf=tmpf->next;
  }
  res+=MSize2(cc->cur_str);
  res+=MSize2(cc);
  return res;
}

U0 LexBackupLastChar(CCmpCtrl *cc)
{
  CLexFile *tmpf=cc->lex_include_stk;
  tmpf->buf_ptr=cc->cur_buf_ptr;
  if (cc->flags&CCF_USE_LAST_U16) {
    tmpf->last_U16=cc->last_U16;
    cc->flags&=~CCF_USE_LAST_U16;
  } else
    tmpf->last_U16=0;
}

U0 LexPush(CCmpCtrl *cc)
{//Save stream state without changing it when allocation fails.
  CLexFile *tmpf=MAlloc(sizeof(CLexFile));
  LexBackupLastChar(cc);
  if (cc->lex_include_stk->last_U16)
    cc->flags|=CCF_USE_LAST_U16;
  MemCpy(tmpf,cc->lex_include_stk,sizeof(CLexFile));
  tmpf->next=cc->lex_prs_stk;
  cc->lex_prs_stk=tmpf;
}

U0 LexPopRestore(CCmpCtrl *cc)
{//Restore a save point within the same include stream.
  CLexFile *tmpf=cc->lex_prs_stk;
  if (!tmpf) throw('LexState');
  cc->cur_buf_ptr=tmpf->buf_ptr;
  if (cc->last_U16=tmpf->last_U16)
    cc->flags|=CCF_USE_LAST_U16;
  else
    cc->flags&=~CCF_USE_LAST_U16;
  MemCpy(cc->lex_include_stk(U8 *)+sizeof(U8 *),tmpf(U8 *)+sizeof(U8 *),
	sizeof(CLexFile)-sizeof(U8 *));
  cc->lex_prs_stk=tmpf->next;
  Free(tmpf);
}

U0 LexPopNoRestore(CCmpCtrl *cc)
{//Discard the most recent save point.
  CLexFile *tmpf=cc->lex_prs_stk;
  if (!tmpf) throw('LexState');
  cc->lex_prs_stk=tmpf->next;
  Free(tmpf);
}
`;
