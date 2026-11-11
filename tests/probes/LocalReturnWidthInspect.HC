
U0 RegDump(U8 *name)
{
  CHashFun *tmpf=HashFind(name,Fs->hash_table,HTT_FUN);
  CMemberLst *tmpm=tmpf->member_lst_and_root;
  while (tmpm) {
    "REG:%s:%s:%d:%d:%d\n",name,tmpm->str,tmpm->reg,
	tmpm->offset,tmpm->size;
    tmpm=tmpm->next;
  }
}
RegDump("RgArrayCast");
RegDump("RgReturnLocal");
RegDump("RgReturnMem");
RegDump("RgReturnValue");
