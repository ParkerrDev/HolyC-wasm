CHashClass *member_owner=NULL;
CMemberLst *member_owned_node=NULL;
I64 member_tasks=0;

U0 MemberChild(U8 *)
{
  if (MemberFind("owned",member_owner)!=member_owned_node ||
	!MemberLstCmp(member_owned_node,member_owned_node) ||
	MemberMetaFind("missing",member_owned_node))
    throw('MbrTask');
  member_tasks++;
}

U0 MemberTask()
{
  I64 i;
  CTask *child;
  member_tasks=0;
  member_owner=NULL;member_owned_node=NULL;
  try {
    member_owner=CAlloc(sizeof(CHashClass));
    member_owned_node=CAlloc(sizeof(CMemberLst));
    member_owner->member_lst_and_root=member_owned_node;
    member_owned_node->str="owned";
    for (i=0;i<4;i++) {
      child=Spawn(&MemberChild,,,,Fs);
      while (TaskValidate(child)) Yield;
      if (member_owned_node->use_cnt!=i+1)
	throw('MbrCount');
    }
    "MemberTask:%d:%d\n",member_tasks,member_owned_node->use_cnt;
  } catch {
    Free(member_owned_node);Free(member_owner);
    member_owner=NULL;member_owned_node=NULL;
  }
  Free(member_owned_node);Free(member_owner);
  member_owner=NULL;member_owned_node=NULL;
}

MemberTask;
