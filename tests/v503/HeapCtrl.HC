//V5.03: each blk names its task's heap, and a task's heap counts its blks.
U0 Child(I64)
{
  while (TRUE) Yield;
}
CTask *t=Spawn(&Child,NULL,"Child",,Fs);
CHeapCtrl *hc=t->data_heap;
U8 *p=MAlloc(8),*q=MAlloc(8,t),*r=MAlloc(8,hc),*s=AMAlloc(8),*u;
I64 used=TaskMemUsed(t),alloced=TaskMemAlloced(t);
"%d%d%d%d%d\n",MHeapCtrl(p)==Fs->data_heap,MHeapCtrl(q)==hc,
	MHeapCtrl(r)==hc,MHeapCtrl(s)==adam_task->data_heap,!MHeapCtrl(NULL);
"%d%d%d\n",hc->mem_task==t,hc->hc_signature==HEAP_CTRL_SIGNATURE_VAL,
	MSize2(q)>MSize(q);
u=MAllocIdent(p,t);
"%d%d\n",MHeapCtrl(u)==hc,MSize(u)==MSize(p);
Free(u);
u=MAlloc(0x10000,t);
"%d%d\n",TaskMemUsed(t)-used>=0x10000,TaskMemAlloced(t)-alloced>=0x10000;
Free(u);
"%d%d\n",TaskMemUsed(t)==used,TaskMemAlloced(t)>=TaskMemUsed(t);
"%d%d\n",sys_code_bp->alloced_u8s>=sys_code_bp->used_u8s,
	sys_code_bp->used_u8s>0;
Free(p);
Free(q);
Free(r);
Free(s);
Kill(t);
"done\n";
