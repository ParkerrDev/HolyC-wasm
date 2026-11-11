U0 LayoutLink()
{
  CDoc doc;
  CDocEntry entry,copy;
  U8 *link;
  I64 mask,tag_case,aux_case;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  MemSet(&doc,0,sizeof(CDoc));
  for (mask=0;mask<8;mask++)
    for (tag_case=0;tag_case<3;tag_case++)
      for (aux_case=0;aux_case<3;aux_case++) {
	MemSet(&entry,0,sizeof(CDocEntry));
	entry.tag="FI:tag";entry.aux_str="FF:aux,needle";
	if (tag_case==1) entry.tag="";
	if (tag_case==2) entry.tag=NULL;
	if (aux_case==1) entry.aux_str="";
	if (aux_case==2) entry.aux_str=NULL;
	if (mask&1) entry.de_flags|=DOCEF_TAG;
	if (mask&2) entry.de_flags|=DOCEF_AUX_STR;
	if (mask&4) entry.de_flags|=DOCEF_LINK;
	MemCpy(&copy,&entry,sizeof(CDocEntry));
	link=DocEntryLink(&doc,&entry);
	if (link) {
	  if (link==entry.tag || link==entry.aux_str) throw('LinkOwn');
	  LayoutMix(StrLen(link));
	  LayoutBytes(link,StrLen(link));
	  Free(link);
	} else
	  LayoutMix(-1);
	if (MemCmp(&copy,&entry,sizeof(CDocEntry))) throw('LinkMut');
	layout_cnt++;
      }
  "LayoutLink:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutLink;
