//A glbl the program declares is in the hash table as V5.03's
//PrsGlblVarLst puts it there, so text it compiles later finds it.
F64 prg_best=12.5;
I64 prg_tab[2][5];
CHashGlblVar *tmpg;

tmpg=HashFind("prg_best",Fs->hash_table,HTT_GLBL_VAR);
"%d %d %d %5.2f\n",tmpg->size,tmpg->dim.total_cnt,tmpg->flags&GVF_ARRAY,
      *tmpg->data_addr(F64 *);
tmpg=HashFind("prg_tab",Fs->hash_table,HTT_GLBL_VAR);
"%d %d %d %d\n",tmpg->size,tmpg->dim.total_cnt,tmpg->flags&GVF_ARRAY,
      tmpg->data_addr==prg_tab;
"%d\n",ExePutS(
      "HashFind(\"prg_tab\",Fs->hash_table,HTT_GLBL_VAR)(CHashGlblVar *)"
      "->data_addr==prg_tab;");
