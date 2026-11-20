
CHashDefineStr *DefineLoad(U8 *dname,U8 *st)
{//Publish a task-owned string define after allocating its fields.
  CHashDefineStr *tmph=CAlloc(sizeof(CHashDefineStr));
  tmph->type=HTT_DEFINE_STR;
  try {
    tmph->str=StrNew(dname);
    tmph->data=StrNew(st);
    tmph->cnt=-1;
    HashAdd(tmph,Fs->hash_table);
    __jit_define(tmph->str,tmph->data);//Later compiles see it, as V5.03's Lex.
  } catch
    HashDel(tmph);
  return tmph;
}

CHashDefineStr *DefineLstLoad(U8 *dname,U8 *lst)
{//The index borrows the original list, as in native V5.03.
  I64 cnt=0;
  U8 *ptr,**idx;
  CHashDefineStr *tmph=CAlloc(sizeof(CHashDefineStr));
  tmph->type=HTT_DEFINE_STR;
  try {
    tmph->str=StrNew(dname);
    ptr=lst;
    while (*ptr) {
      if (*ptr!='@') cnt++;
      while (*ptr++);
    }
    tmph->data=MAlloc(ptr+1-lst);
    MemCpy(tmph->data,lst,ptr+1-lst);
    tmph->cnt=cnt;
    idx=tmph->sub_idx=MAlloc(cnt*sizeof(U8 *));
    ptr=lst;
    while (*ptr) {
      if (*ptr!='@') *idx++=ptr;
      while (*ptr++);
    }
    HashAdd(tmph,Fs->hash_table);
  } catch {
    Free(tmph->sub_idx);
    HashDel(tmph);
  }
  return tmph;
}

U0 UndefinedDefine(U8 *dname)
{
  ST_ERR_ST "Undefined Define: '%s'.\n",dname;
  throw('UndefDef');
}

U8 *Define(U8 *dname)
{//Return the newest visible string define.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return tmph->data;
  if (dname) UndefinedDefine(dname);
  return NULL;
}

U8 *DefineSub(I64 sub,U8 *dname)
{//Return an indexed list entry, excluding aliases.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR)) {
    if (0<=sub<tmph->cnt) return tmph->sub_idx[sub];
    return NULL;
  }
  if (dname) UndefinedDefine(dname);
  return NULL;
}

I64 DefineCnt(U8 *dname)
{//String defines have count -1.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return tmph->cnt;
  if (dname) UndefinedDefine(dname);
  return -1;
}

I64 DefineMatch(U8 *needle,U8 *haystack_lst_dname,I64 flags=0)
{
  return LstMatch(needle,Define(haystack_lst_dname),flags);
}

U0 DefinePrint(U8 *dname,U8 *src,...)
{//Create a string define using native formatting.
  U8 *buf=StrPrintJoin(NULL,src,argc,argv);
  try DefineLoad(dname,buf);
  catch Free(buf);
  Free(buf);
}

I64 HashDefineLstAdd(U8 *dname,I64 type,CHashTable *table)
{//List expansion allocates entries on the calling task's heap.
  CHashDefineStr *tmph;
  if (tmph=HashFind(dname,Fs->hash_table,HTT_DEFINE_STR))
    return HashLstAdd(tmph->data,type,table);
  return 0;
}

//V5.03 KDefine.HC's SysDefinesLoad, which KMain runs; here a runtime
//initializer (src/prelude.js).
U0 SysDefinesLoad()
{
  DefineLstLoad("ST_OFF_ON","Off\0On\0");
  DefineLstLoad("ST_HTT_TYPES","ExportSysSym\0ImportSysSym\0DefineStr\0GlbVar\0"
	"Class\0IntType\0Funct\0Word\0DictWord\0KeyWord\0AsmKeyWord\0OpCode\0"
	"Reg\0File\0Module\0HelpFile\0Frame Ptr\0 \0 \0 \0 \0 \0 \0Private\0"
	"Public\0Export\0Import\0Imm\0Goto\0Res\0Unres\0Local\0");
  DefineLstLoad("ST_DAYS_OF_WEEK","Sunday\0Monday\0Tuesday\0Wednesday\0"
	"Thursday\0Friday\0Saturday\0");
  DefineLstLoad("ST_MONTHS","January\0February\0March\0April\0May\0"
	"June\0July\0August\0September\0October\0November\0December\0");
  DefineLstLoad("ST_FILE_ATTRS","R\0H\0S\0V\0D\0A\0 \0 \0X\0T\0Z\0C\0F\0");
  DefineLstLoad("ST_FILE_UTIL_FLAGS","r\0d\0i\0a\0c\0R\0p\0m\0x\0s\0"
	"D\0F\0T\0$$\0S\0A\0J\0G\0Z\0O\0P\0f\0l\0lb\0la\0");
  DefineLstLoad("ST_BLKDEV_TYPES",
	"NULL\0RAM\0ATA\0FILE_READ\0FILE_WRITE\0ATAPI\0");
  DefineLstLoad("ST_DRV_TYPES",
	"NULL\0REDSEA\0FAT32\0ISO9660\0NTFS\0UNKNOWN\0");
  DefineLstLoad("ST_COLORS","BLACK\0BLUE\0GREEN\0CYAN\0"
	"RED\0PURPLE\0BROWN\0LTGRAY\0DKGRAY\0LTBLUE\0LTGREEN\0"
	"LTCYAN\0LTRED\0LTPURPLE\0YELLOW\0WHITE\0");
  DefineLstLoad("ST_INT_NAMES","Divide Error\0SingleStep\0NMI\0Breakpoint\0"
	"Overflow\0BOUND Range Exceeded\0Invalid Opcode\0No Math Coprocessor\0"
	"Double Fault\0Coprocessor Segment Fault\0Invalid TASK\0"
	"Segment Not Present\0Stk Segment Fault\0General Protection\0"
	"Page Fault\0 \0Math Fault\0Alignment Check\0Machine Check\0"
	"SIMD Exception\0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0"
	" \0 \0 \0 \0 \0 \0 \0 \0 \0 \0 \0MP Crash\0Wake\0Dbg\0");
}
