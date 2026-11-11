U0 DefineMetaChk(CHashDefineStr *entry)
{
  U8 *ptr=entry->src_link;
  if (!ptr || ptr[0]!='A' || ptr[1]!='D' || ptr[2]!=':' ||
	ptr[3]!='0' || ptr[4]!='x' || !ptr[5]) throw('DefMeta');
  ptr+=5;
  while (*ptr) {
    if (!('0'<=*ptr<='9' || 'A'<=*ptr<='F')) throw('DefMeta');
    ptr++;
  }
}
