class CQueryInner
{
  U8 first;
  I32 values[3];
  U8 last;
};

class CQueryOuter
{
  U16 tag;
  CQueryInner item,*ptr,items[2];
  I64 tail;
};

CQueryOuter query_records[3];
U8 query_bytes[sizeof(CQueryInner.values)+offset(CQueryOuter.tail)];
I64 query_sizes[2]={sizeof(CQueryOuter.item),CQueryOuter.tail},
	query_index=0,query_values[2]={3,4};

U0 LayoutQuery()
{
  CQueryOuter rec,*ptr=&rec;
  U8 bytes[sizeof(rec.items)];
  bytes[0]=1;
  "%d %d %d %d\n",sizeof(bytes),bytes[0],query_sizes[0],query_sizes[1];
  "%d %d %d %d\n",sizeof(CQueryInner),sizeof(CQueryOuter),
	sizeof(query_records),sizeof(query_bytes);
  "%d %d %d %d\n",sizeof(CQueryOuter.item),
	sizeof(CQueryOuter.item.values),sizeof(query_records.items),
	sizeof(rec.items);
  "%d %d %d %d\n",offset(CQueryOuter.item.values),
	offset(query_records.items.last),offset(rec.tail),
	CQueryOuter.tail;
  "%d %d %d\n",sizeof(CQueryInner *),sizeof((CQueryOuter.item*)),
	sizeof(ptr);
  "%d ",query_values[query_index];
  query_index=1;
  "%d\n",query_values[query_index];
}

LayoutQuery;
