class CPadding
{
  U8 pad;
  U16 pad;
  U32 reserved;
  U64 reserved;
  I64 _anon_;
  U8 _anon_;
};

class CPaddingChild : CPadding
{
  U16 pad;
  I32 pad;
  U8 tail;
};

U0 PaddingMember()
{
  CPadding plain;
  CPaddingChild child;
  I64 i;
  U8 *ptr;
  MemSet(&plain,0,sizeof(CPadding));
  MemSet(&child,0,sizeof(CPaddingChild));
  plain.pad=0x1234;plain.reserved=0x5566778899;
  plain._anon_=0x1122334455667788;
  child.pad=0x12345678;
  "%d %d %d %d\n",sizeof(CPadding),offset(CPadding.pad),
	offset(CPadding.reserved),offset(CPadding._anon_);
  "%d %d %d %d\n",sizeof(CPaddingChild),offset(CPaddingChild.pad),
	offset(CPaddingChild.reserved),offset(CPaddingChild.tail);
  ptr=&plain;
  for (i=0;i<sizeof(CPadding);i++) "%02X",ptr[i];
  "\n";
  ptr=&child;
  for (i=0;i<sizeof(CPaddingChild);i++) "%02X",ptr[i];
  "\n";
}

PaddingMember;
