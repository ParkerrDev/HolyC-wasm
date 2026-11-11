I64 ht_initial_mask=Fs->hash_table->mask,ht_error=0,ht_result=0;

U0 HashTaskChild(U8 *)
{
  CHashGeneric *entry;
  I64 arg1,arg2;
  if (Fs->hash_table->mask!=1023 ||
	Fs->hash_table->next!=Fs->parent_task->hash_table)
    ht_error=1;
  GetMsg(&arg1,&arg2,1<<MSG_CMD);
  entry=HashFind("A52Foreign",Fs->hash_table,HTT_FRAME_PTR);
  if (!entry || entry->user_data0!=73) ht_error=2;
  entry=HashFind("A52Parent",Fs->hash_table,HTT_FRAME_PTR);
  if (!entry || entry->user_data0!=17) ht_error=3;
  entry=HashGenericAdd("A52Parent",HTT_FRAME_PTR,29);
  if (HashFind("A52Parent",Fs->hash_table,HTT_FRAME_PTR)!=entry)
    ht_error=4;
  ht_result=entry->user_data0;
}

U0 HashTask()
{
  CHashGeneric *entry,*parent_entry;
  CHashTable *table=Fs->hash_table;
  CTask *child;
  I64 i;
  if (ht_initial_mask!=1023 || table->mask!=1023) throw('HashInit');
  ht_error=ht_result=0;
  parent_entry=HashGenericAdd("A52Parent",HTT_FRAME_PTR,17);
  for (i=0;i<4;i++) {
    child=Spawn(&HashTaskChild,,,,Fs);
    entry=HashGenericAdd("A52Foreign",HTT_FRAME_PTR,73,0,0,child);
    if (HashFind("A52Foreign",child->hash_table,HTT_FRAME_PTR)!=entry)
      throw('Foreign');
    PostMsg(child,MSG_CMD,1,0);
    while (TaskValidate(child)) Yield;
    if (ht_error || ht_result!=29 || Fs->hash_table!=table)
      throw('HashTask');
    entry=HashFind("A52Parent",table,HTT_FRAME_PTR);
    if (entry!=parent_entry || entry->user_data0!=17 ||
	  HashFind("A52Foreign",table,HTT_FRAME_PTR))
      throw('Ancestor');
  }
  if (!HashRemDel(parent_entry,table)) throw('HashRem');
  "HashTask:%d:%d:%d\n",ht_initial_mask,ht_result,ht_error;
}

HashTask;
