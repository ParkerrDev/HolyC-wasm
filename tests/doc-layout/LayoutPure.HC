U0 LayoutPure()
{
  CDoc doc,saved;
  CDocEntry entry,copy;
  I64 mask,n,j,k,x,y,flags,attr;
  layout_hash=14695981039346656037;
  layout_cnt=0;
  for (mask=0;mask<256;mask++)
    for (n=0;n<6;n++) {
      MemSet(&doc,0,sizeof(CDoc));
      MemSet(&entry,0,sizeof(CDocEntry));
      entry.de_flags=mask<<20;
      if (mask&64) entry.de_flags|=DOCEF_MARGIN_REL_X;
      if (mask&128) entry.de_flags|=DOCEF_PAGE_REL_Y;
      entry.page_line_num=n*17-20;
      entry.settings.page_len=n*11+1;
      entry.settings.header=n*3;
      entry.settings.footer=n*2;
      if (!n) {
	entry.settings.header=DOC_DFT;
	entry.settings.footer=DOC_DFT;
      }
      if (n==5) {
	entry.settings.header=65535;
	entry.settings.footer=65535;
      }
      doc.page_line_num=n*23-40;
      doc.flags=DOCEF_WORD_WRAP;
      x=n*7-15;y=n*13-20;
      MemCpy(&saved,&doc,sizeof(CDoc));
      MemCpy(&copy,&entry,sizeof(CDocEntry));
      DocRecalcXY(&doc,&entry,n*5+1,-9,79,25,-7,51,11,-13,&x,&y);
      LayoutMix(x);LayoutMix(y);LayoutMix(doc.page_line_num);
      LayoutMix(doc.flags);
      saved.flags=doc.flags;saved.page_line_num=doc.page_line_num;
      if (MemCmp(&doc,&saved,sizeof(CDoc)) ||
	    MemCmp(&entry,&copy,sizeof(CDocEntry))) throw('LayXY');
      layout_cnt++;
    }
  for (n=0;n<DOCT_TYPES_NUM;n++)
    for (mask=0;mask<64;mask++)
      for (j=0;j<3;j++) {
	MemSet(&doc,0,sizeof(CDoc));
	MemSet(&entry,0,sizeof(CDocEntry));
	entry.type=n|0xA5000000;
	entry.tag="<binary>";
	flags=0;
	if (mask&1) flags|=DOCEF_HAS_BIN;
	if (mask&2) flags|=DOCEF_LEFT_EXP;
	if (mask&4) flags|=DOCEF_LINK;
	if (mask&8) flags|=DOCEF_LEFT_MACRO;
	if (mask&16) flags|=DOCEF_TREE;
	if (mask&32) flags|=DOCEF_LST;
	entry.de_flags=flags|DOCEF_SKIP|DOCEF_HIGHLIGHT;
	entry.settings.shifted_x=j*31-17;
	entry.settings.shifted_y=17-j*37;
	doc.flags=mask<<26;
	if (j==1) doc.cur_entry=&entry;
	if (j==2) {
	  doc.cur_entry=&entry;
	  doc.flags|=DOCF_DONT_HIGHLIGHT_CURSOR;
	}
	MemCpy(&saved,&doc,sizeof(CDoc));
	MemCpy(&copy,&entry,sizeof(CDocEntry));
	attr=DocTmpAttr(&doc,&entry,0x49+j*0x37);
	LayoutMix(attr);LayoutMix(entry.type);LayoutMix(entry.de_flags);
	LayoutMix(entry.settings.final_u32_attr);
	copy.type=entry.type;copy.de_flags=entry.de_flags;
	copy.settings.final_u32_attr=entry.settings.final_u32_attr;
	if (MemCmp(&doc,&saved,sizeof(CDoc)) ||
	      MemCmp(&entry,&copy,sizeof(CDocEntry))) throw('LayAttr');
	layout_cnt++;
      }
  for (j=-3;j<=3;j++)
    for (k=-3;k<=3;k++) {
      doc.x=j*23;doc.y=k*19;
      LayoutMix(DocCharDist(&doc,11,-17));
      layout_cnt++;
    }
  "LayoutPure:%016X:%d\n",layout_hash,layout_cnt;
}

LayoutPure;
