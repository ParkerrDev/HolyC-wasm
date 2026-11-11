U64 doc_nav_hash=0;
I64 doc_nav_cnt=0;

U0 DocNavMix(I64 n)
{
  doc_nav_hash=(doc_nav_hash^n)*1099511628211;
}

U0 DocNavCase(I64 cnt,I64 types,I64 flags,I64 form,I64 dir,
	I64 giveup,I64 pos)
{
  CDoc doc,saved;
  CDocEntry nodes[4],copies[4],*entry;
  I64 i,res=-1;
  MemSet(&doc,0,sizeof(CDoc));
  MemSet(nodes,0,sizeof(nodes));
  QueInit(&doc.head);
  doc.head.type=DOCT_ERROR;
  doc.flags=form*DOCF_FORM;
  doc.cur_col=37;
  for (i=0;i<cnt;i++) {
    entry=&nodes[i];
    entry->type=types.u8[i];
    entry->de_flags=0;
    if (Bt(&flags,i*2)) entry->de_flags|=DOCEF_LINK;
    if (Bt(&flags,i*2+1)) entry->de_flags|=DOCEF_SKIP_IN_FORM;
    entry->min_col=i*7+3;
    QueIns(entry,doc.head.last);
  }
  if (pos==cnt) doc.cur_entry=&doc.head;
  else doc.cur_entry=&nodes[pos];
  MemCpy(&saved,&doc,sizeof(CDoc));
  MemCpy(copies,nodes,sizeof(nodes));
  if (dir) DocFormBwd(&doc,giveup);
  else DocFormFwd(&doc,giveup);
  if (doc.cur_entry==&doc.head) res=cnt;
  else
    for (i=0;i<cnt;i++)
      if (doc.cur_entry==&nodes[i]) res=i;
  if (res<0) throw('NavPtr');
  DocNavMix(res);
  DocNavMix(doc.cur_col);
  saved.cur_entry=doc.cur_entry;
  saved.cur_col=doc.cur_col;
  if (MemCmp(&saved,&doc,sizeof(CDoc)) ||
	MemCmp(copies,nodes,sizeof(nodes))) throw('NavState');
  doc_nav_cnt++;
}

U0 DocNavModes(I64 cnt,I64 types,I64 flags)
{
  I64 form,dir,giveup,pos;
  for (form=0;form<2;form++)
    for (dir=0;dir<2;dir++)
      for (giveup=0;giveup<2;giveup++)
	for (pos=0;pos<=cnt;pos++)
	  DocNavCase(cnt,types,flags,form,dir,giveup,pos);
}

U0 DocNavigate()
{
  I64 i,j,types,flags,kind;
  doc_nav_hash=14695981039346656037;
  doc_nav_cnt=0;
  DocNavModes(0,0,0);
  for (i=0;i<DOCT_TYPES_NUM;i++)
    for (j=0;j<4;j++) DocNavModes(1,i,j);
  for (i=0;i<256;i++) {
    types=0;
    flags=i*103&255;
    for (j=0;j<4;j++) {
      kind=i>>(j*2)&3;
      switch (kind) {
	case 0:
	  types.u8[j]=DOCT_TEXT;
	  break;
	case 1:
	  types.u8[j]=DOCT_DATA;
	  break;
	case 2:
	  types.u8[j]=DOCT_INDENT;
	  break;
	case 3:
	  types.u8[j]=DOCT_LINK;
	  break;
      }
    }
    DocNavModes(4,types,flags);
  }
  "DocNavigate:%016X:%d\n",doc_nav_hash,doc_nav_cnt;
}

DocNavigate;
