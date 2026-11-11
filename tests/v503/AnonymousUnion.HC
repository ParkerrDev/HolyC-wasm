class CUnionPair
{
  U16 low;
  U32 high;
};

class CUnionBase
{
  U8 tag;
};

class CUnionRecord : CUnionBase
{
  union {
    U64 whole;
    CUnionPair pair;
    U8 bytes[8];
    union {
      U16 after;
      U32 after_wide;
    }
    U8 back;
  }
  U8 tail;
};

U64 class CUnionScalar
{
  union {
    U64 whole;
    U32 words[2];
    U8 bytes[8];
  }
};

CUnionRecord union_records[2];

U0 AnonymousUnion()
{
  CUnionRecord rec;
  CUnionScalar num;
  I64 i;
  MemSet(&rec,0,sizeof(CUnionRecord));
  rec.tag=1;rec.tail=2;
  rec.whole=0x123456789ABCDEF0;
  rec.after_wide=0x87654321;
  "%d %d %d %d %d %d %d\n",sizeof(CUnionRecord),
	offset(CUnionRecord.whole),offset(CUnionRecord.pair.high),
	offset(CUnionRecord.after),offset(CUnionRecord.after_wide),
	offset(CUnionRecord.back),offset(CUnionRecord.tail);
  "%X %X %X %X %d %d\n",rec.whole,rec.pair.low,
	rec.pair.high,rec.after,rec.tag,rec.tail;
  rec.bytes[2]=0xA5;
  rec.back=0xB7;
  "%X\n",rec.whole;
  for (i=0;i<2;i++) {
    union_records[i].whole=i+0xAA;
    union_records[i].after=i+0xBB;
  }
  "%d %X %X\n",sizeof(union_records),union_records[1].whole,
	union_records[1].after;
  num=0x123456789ABCDEF0;
  num.words[1]=0xABCDEF01;
  "%d %X %X %X\n",sizeof(CUnionScalar),num,num.whole,num.bytes[7];
}

AnonymousUnion;
