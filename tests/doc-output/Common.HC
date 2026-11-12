I64 parse_hash=0xCBF29CE484222325,parse_count=0;
U0 ParseBytes(U8 *ptr,I64 n)
{
  while (n--) parse_hash=(parse_hash^*ptr++)*1099511628211;
}
U0 ParseString(U8 *st)
{
  I64 len=-1;
  if (st) len=StrLen(st);
  ParseBytes(&len,8);
  if (st) ParseBytes(st,len);
}
U0 ParseState(CDocEntry *entry)
{
  CDocEntry copy;
  MemCpy(&copy,entry,sizeof(CDocEntry));
  copy.next=copy.last=NULL;
  copy.tag=ToBool(copy.tag);copy.aux_str=ToBool(copy.aux_str);
  copy.define_str=ToBool(copy.define_str);copy.html_link=ToBool(copy.html_link);
  copy.left_macro=ToBool(copy.left_macro);
  copy.right_macro=ToBool(copy.right_macro);
  copy.bin_ptr_link=ToBool(copy.bin_ptr_link);
  copy.bin_data=ToBool(copy.bin_data);copy.data=ToBool(copy.data);
  ParseBytes(&copy,sizeof(CDocEntry));
  ParseString(entry->tag);ParseString(entry->aux_str);
  ParseString(entry->define_str);ParseString(entry->html_link);
  ParseString(entry->left_macro);ParseString(entry->right_macro);
  ParseString(entry->bin_ptr_link);
  parse_count++;
}
U0 ParseFree(CDocEntry *entry)
{
  Free(entry->tag);Free(entry->aux_str);Free(entry->define_str);
  Free(entry->html_link);Free(entry->left_macro);Free(entry->right_macro);
  Free(entry->bin_ptr_link);Free(entry);
}
