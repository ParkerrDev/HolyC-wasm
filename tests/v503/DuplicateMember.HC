class CDupBase
{
  U8 tag;
  I32 value;
};

class CDupDerived : CDupBase
{
  U16 mid;
  I64 value;
  U8 tail;
};

class CDupPlain
{
  U8 value;
  U32 value;
  union {
    U16 value;
    U32 other;
  }
};

U0 DuplicateMember()
{
  CDupPlain plain;
  CDupDerived derived;
  U8 *ptr;
  I64 i;
  MemSet(&plain,0,sizeof(CDupPlain));
  MemSet(&derived,0,sizeof(CDupDerived));
  plain.value=0x12345678;
  derived.value=0x1122334455667788;
  "%d %d %d %d\n",sizeof(CDupPlain),offset(CDupPlain.value),
	sizeof(plain.value),offset(CDupPlain.other);
  "%d %d %d %d\n",sizeof(CDupDerived),offset(CDupDerived.value),
	sizeof(derived.value),offset(CDupDerived.tail);
  ptr=&plain;
  for (i=0;i<sizeof(CDupPlain);i++) "%02X",ptr[i];
  "\n";
  ptr=&derived;
  for (i=0;i<sizeof(CDupDerived);i++) "%02X",ptr[i];
  "\n";
}

DuplicateMember;
