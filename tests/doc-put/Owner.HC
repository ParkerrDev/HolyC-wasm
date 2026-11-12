CDoc *put_owner_doc=NULL;
Bool put_owner_done=FALSE;

U0 PutOwnerWait(U8 *)
{
  while (TRUE) Yield;
}

U0 PutOwnerBody(U8 *)
{
  DocPrint(put_owner_doc,"prefix\t$$TR,\"tree\",A=\"aux\","
	"D=\"DEF\",HTML=\"url\",LM=\"L;\",RM=\"R;\"$$\nsuffix");
  put_owner_done=TRUE;
  while (TRUE) Yield;
}

U0 PutOwned(U8 *ptr,CTask *task)
{
  if (ptr && MHeapCtrl(ptr)->mem_task!=task) throw('PutOwner');
}

U0 PutOwnerTest()
{
  CTask *owner,*caller;
  CDocEntry *entry;
  I64 before,i,cnt=0;
  RecalcWindow(0);
  owner=Spawn(&PutOwnerWait,NULL,"Doc owner");
  before=owner->data_heap->used_u8s;
  for (i=0;i<3;i++) {
    put_owner_doc=RecalcNew(owner);
    put_owner_done=FALSE;
    caller=Spawn(&PutOwnerBody,NULL,"Output");
    while (!put_owner_done) Yield;
    Kill(caller);
    entry=put_owner_doc->head.next;
    while (entry!=put_owner_doc) {
      PutOwned(entry,owner);PutOwned(entry->tag,owner);
      if (MSize(entry)>=sizeof(CDocEntry)) {
	PutOwned(entry->aux_str,owner);PutOwned(entry->define_str,owner);
	PutOwned(entry->html_link,owner);PutOwned(entry->left_macro,owner);
	PutOwned(entry->right_macro,owner);
      }
      cnt++;entry=entry->next;
    }
    RecalcDel(put_owner_doc);put_owner_doc=NULL;
    if (owner->data_heap->used_u8s!=before) throw('PutLeak');
  }
  Kill(owner);
  "PutOwner:3:%d\n",cnt;
}

PutOwnerTest;
