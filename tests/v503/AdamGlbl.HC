//Sudoku's best times: a glbl Adam's text declares is in adam_task's
//hash table from then on, so it is not declared again over its value.
F64 Best(I64 n)
{
  F64 res;
  U8 *tmp,*var=MStrPrint("adam_glbl_%d",n);
  if (!HashFind(var,adam_task->hash_table,HTT_GLBL_VAR)) {
    tmp=MStrPrint("F64 %s=99999999;\n",var);
    Adam(tmp);
    Free(tmp);
  }
  tmp=MStrPrint("%s;\n",var);
  res=ExePrint(tmp)(F64);
  Free(tmp);
  Free(var);
  return res;
}
"%5.2f\n",Best(22);
Adam("F64 adam_glbl_22=12.50;\n");
"%5.2f\n",Best(22);
"%5.2f\n",Best(23);
