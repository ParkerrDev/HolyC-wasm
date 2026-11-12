//Native finite byte streams; compiler graphs and document input stay unavailable.
export const LEX_TYPES_SRC=String.raw`
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
`;

export const LEX_BITMAP_SRC=String.raw`
U32 char_bmp_printable[16]=
  {0x80002600,0xFFFFFFFF,0xFFFFFFFF,0x7FFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0,0,0,0,0,0,0,0},
  char_bmp_non_eol[16]=
  {0xFFFFDBFE,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,
  0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF,0xFFFFFFFF};
`;

export const LEX_GLOBALS_SRC=String.raw`
CCmpGlbls cmp;

U0 CmpLexHostInit()
{//Only lexical state is available; compiler-owned graphs remain absent.
  MemSet(&cmp,0,sizeof(CCmpGlbls));
}
`;

export const LEX_SRC=String.raw`
I64 LexGetChar(CCmpCtrl *cc)
{//Get one byte-stream character, including native one-character put-back.
  U8 *src;
  CLexFile *tmpf;
  if (cc->flags&CCF_PMT) throw('LexMode');
  if (!cc->lex_include_stk) throw('LexState');
  LexFileHostChk(cc->lex_include_stk);
  if (!Btr(&cc->flags,CCf_USE_LAST_U16)) {
lgc_start:
    if (!(src=cc->cur_buf_ptr++)) {
      cc->cur_buf_ptr=NULL;
      goto lgc_eof;
    }
    switch [cc->last_U16=*src++] {
      case 0:
lgc_eof:
	tmpf=cc->lex_include_stk;
	if (tmpf->next) {
	  tmpf=LexFilePop(cc);
	  cc->cur_buf_ptr=tmpf->buf_ptr;
	  cc->flags&=~CCF_USE_LAST_U16;
	  if (!(cc->last_U16=tmpf->last_U16))
	    goto lgc_start;
	} else {
	  if (src) cc->cur_buf_ptr=src-1;
	  cc->last_U16=TK_EOF;
	}
	break;
      case CH_CURSOR:
	goto lgc_start;
      case '\n':
	tmpf=cc->lex_include_stk;
	tmpf->line_num++;
	cmp.compiled_lines++;
	tmpf->line_start=src;
	break;
      case 0xFF:
	break;
    }
    if (cc->last_U16==CH_SHIFT_SPACE) cc->last_U16=CH_SPACE;
    if (cc->opts&OPTF_ECHO && cc->last_U16<256 &&
	Bt(char_bmp_printable,cc->last_U16))
      '' cc->last_U16;
  }
  return cc->last_U16;
}

U0 LexSkipEol(CCmpCtrl *cc)
{//Read through the next native end-of-line byte.
  I64 ch;
  do ch=LexGetChar(cc);
  while (Bt(char_bmp_non_eol,ch));
}

U0 LexIncludeStr(CCmpCtrl *cc,U8 *abs_filename,U8 *src,Bool actual_file)
{//Adopt a nested byte stream only after its record and name are allocated.
  CLexFile *tmpf=NULL;
  if (cc->flags&CCF_PMT) throw('LexMode');
  LexFileHostChk(cc->lex_include_stk);
  try {
    tmpf=CAlloc(sizeof(CLexFile));
    if (actual_file) tmpf->full_name=StrNew(abs_filename);
    else tmpf->full_name=StrNew(blkdev.tmp_filename);
  } catch {
    if (tmpf) {
      Free(tmpf->full_name);
      Free(tmpf);
    }
  }
  LexBackupLastChar(cc);
  tmpf->next=cc->lex_include_stk;
  tmpf->depth=tmpf->next->depth+1;
  cc->lex_include_stk=tmpf;
  tmpf->line_num=1;
  tmpf->buf=tmpf->buf_ptr=tmpf->line_start=cc->cur_buf_ptr=src;
}
`;
