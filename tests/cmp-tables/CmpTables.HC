U64 tables_hash=14695981039346656037;
I64 tables_cnt=0;

U0 TablesMix(I64 value)
{
  tables_hash=(tables_hash^value)*1099511628211;
  tables_cnt++;
}

U0 CmpTables()
{
  I64 i;
  tables_hash=14695981039346656037;tables_cnt=0;
  TablesMix(REG_REGS_NUM);TablesMix(TK_TKS_NUM);
  TablesMix(cmp.num_reg_vars);TablesMix(cmp.num_non_ptr_vars);
  TablesMix(cmp.reg_vars_mask);TablesMix(cmp.non_ptr_vars_mask);
  for (i=0;i<REG_REGS_NUM;i++) {
    TablesMix(cmp.to_reg_vars_map[i]);
    TablesMix(cmp.non_ptr_vars_map[i]);
  }
  for (i=0;i<TK_TKS_NUM;i++) {
    TablesMix(cmp.dual_U16_tokens1[i]);
    TablesMix(cmp.dual_U16_tokens2[i]);
    TablesMix(cmp.dual_U16_tokens3[i]);
    TablesMix(cmp.binary_ops[i]);
  }
  "CmpTables:%016X:%d\n",tables_hash,tables_cnt;
}

CmpTables;
