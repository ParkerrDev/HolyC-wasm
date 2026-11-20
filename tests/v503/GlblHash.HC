//V5.03 PrsGlblVarLst HashAdds each glbl text declares, so HashFind sees
//it and one declared again is found first (Sudoku's best times).
CHashGlblVar *tmpg;
F64 *best;
"%d\n",ToBool(HashFind("glbl_hash_t",Fs->hash_table,HTT_GLBL_VAR));
ExePutS("F64 glbl_hash_t=99999999;I64 glbl_hash_a[3][4];");
tmpg=HashFind("glbl_hash_t",Fs->hash_table,HTT_GLBL_VAR);
best=tmpg->data_addr;
"%d %d %d %d\n",tmpg->size,tmpg->dim.total_cnt,tmpg->flags&GVF_ARRAY,
      *best==99999999;
ExePutS("F64 glbl_hash_t=12.50;");
tmpg=HashFind("glbl_hash_t",Fs->hash_table,HTT_GLBL_VAR);
best=tmpg->data_addr;
"%5.2f %5.2f\n",*best,ExePutS("glbl_hash_t;")(F64);
tmpg=HashFind("glbl_hash_a",Fs->hash_table,HTT_GLBL_VAR);
"%d %d %d %s\n",tmpg->size,tmpg->dim.total_cnt,tmpg->flags&GVF_ARRAY,
      tmpg->str;
