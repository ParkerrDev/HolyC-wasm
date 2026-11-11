CCmpGlbls *tables_alias=&cmp;

I64 TableDirect()
{
  return cmp.dual_U16_tokens1['+'];
}

I64 TableTyped()
{
  return tables_alias->dual_U16_tokens1['+'];
}

I64 TableRaw()
{
  U8 *ptr=&cmp;
  U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);
  return d['+'];
}

I64 TableMember()
{
  U8 *ptr=&cmp.compiled_lines;
  U32 *d;
  ptr-=offset(CCmpGlbls.compiled_lines);
  d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);
  return d['+'];
}

I64 TableArray()
{
  U8 *ptr=cmp.internal_types;
  U32 *d;
  ptr-=offset(CCmpGlbls.internal_types);
  d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);
  return d['+'];
}

I64 TableDefault(U8 *ptr=&cmp)
{
  U32 *d=*(ptr+offset(CCmpGlbls.dual_U16_tokens1))(U32 **);
  return d['+'];
}

U0 CmpAliases()
{
  "CmpAliases:%X:%X:%X:%X:%X:%X\n",TableDirect,TableTyped,
	TableRaw,TableMember,TableArray,TableDefault;
}

CmpAliases;
