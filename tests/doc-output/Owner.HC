CDoc *parse_owner_doc=NULL;
CDocEntry *parse_owned_entry=NULL;
Bool parse_owner_done=FALSE;

U0 ParseOwnerWait(U8 *)
{
  while (TRUE) Yield;
}

U0 ParseOwnerBody(U8 *)
{
  parse_owned_entry=PrsDollarCmd(parse_owner_doc,
	"TR,\"tree\",A=\"aux\",D=\"DEF\",HTML=\"url\",LM=\"L;\",RM=\"R;\"");
  parse_owner_done=TRUE;
  while (TRUE) Yield;
}

U0 ParseOwned(U8 *ptr,CTask *task)
{
  if (!ptr || MHeapCtrl(ptr)->mem_task!=task) throw('PrsOwner');
}

U0 ParseOwnerTest()
{
  CTask *owner,*caller;
  I64 before,i;
  owner=Spawn(&ParseOwnerWait,NULL,"Doc owner");
  parse_owner_doc=CAlloc(sizeof(CDoc));
  parse_owner_doc->mem_task=owner;
  before=owner->data_heap->used_u8s;
  for (i=0;i<3;i++) {
    parse_owner_done=FALSE;
    caller=Spawn(&ParseOwnerBody,NULL,"Parser");
    while (!parse_owner_done) Yield;
    Kill(caller);
    ParseOwned(parse_owned_entry,owner);
    ParseOwned(parse_owned_entry->tag,owner);
    ParseOwned(parse_owned_entry->aux_str,owner);
    ParseOwned(parse_owned_entry->define_str,owner);
    ParseOwned(parse_owned_entry->html_link,owner);
    ParseOwned(parse_owned_entry->left_macro,owner);
    ParseOwned(parse_owned_entry->right_macro,owner);
    if (StrCmp(parse_owned_entry->tag,"+] tree")) throw('PrsTag');
    ParseFree(parse_owned_entry);parse_owned_entry=NULL;
    if (owner->data_heap->used_u8s!=before) throw('PrsLeak');
  }
  Free(parse_owner_doc);parse_owner_doc=NULL;
  Kill(owner);
  "ParseOwner:3:7\n";
}

ParseOwnerTest;
