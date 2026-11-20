U64 recalc_hash=0;
I64 recalc_cnt=0;

U0 RecalcMix(I64 value)
{
  recalc_hash=(recalc_hash^value)*1099511628211;
}

U0 RecalcBytes(U8 *ptr,I64 size)
{
  I64 i;
  for (i=0;i<size;i++) RecalcMix(ptr[i]);
}

I64 RecalcIdx(CDoc *doc,CDocEntry *entry)
{
  CDocEntry *tmpde=doc->head.next;
  I64 i=0;
  if (entry==doc) return -1;
  if (!entry) return -2;
  while (tmpde!=doc) {
    if (tmpde==entry) return i;
    tmpde=tmpde->next;
    if (++i>4096) throw('RecalcQ');
  }
  return -3;
}

CDoc *RecalcNew(CTask *owner=NULL)
{
  CDoc *doc;
  if (!owner) owner=Fs;
  doc=CAlloc(sizeof(CDoc),owner);
  doc->doc_signature=DOC_SIGNATURE_VAL;
  doc->mem_task=owner;doc->win_task=Fs;
  StrCpy(doc->filename.name,"Layout.DD");
  QueInit(&doc->head);QueInit(&doc->bin_head);QueInit(&doc->undo_head);
  doc->head.type=DOCT_ERROR;
  doc->cur_entry=doc;
  doc->max_entries=I64_MAX;
  doc->old_cur_col=-11;
  doc->settings_head.page_len=66;
  doc->settings_head.cur_text_attr=0x70;
  doc->settings_head.dft_text_attr=0x70;
  MemCpy(&doc->head.settings,&doc->settings_head,sizeof(CDocSettings));
  return doc;
}

CDocEntry *RecalcEntry(CDoc *doc,I64 type,U8 *tag=NULL,I64 attr=0,
	I64 flags=0)
{
  CDocEntry *entry=CAlloc(sizeof(CDocEntry),doc->mem_task);
  entry->type=type;
  entry->de_flags=flags;
  entry->attr=attr;
  if (tag) {
    entry->tag=StrNew(tag,doc->mem_task);
    entry->de_flags|=DOCEF_TAG;
    entry->max_col=StrLen(tag);
  }
  QueIns(entry,doc->head.last);
  return entry;
}

U0 RecalcDel(CDoc *doc)
{
  while (doc->head.next!=doc) DocEntryDel(doc,doc->head.next);
  Free(doc);
}

U0 PutString(U8 *st)
{
  I64 len=-1;
  if (st) len=StrLen(st);
  RecalcMix(len);
  if (st) RecalcBytes(st,len);
}

U0 RecalcState(CDoc *doc)
{
  CDoc copy;
  CDocEntry node,*entry=doc->head.next;
  I64 size,cnt=0;
  MemCpy(&copy,doc,sizeof(CDoc));
  copy.head.next=RecalcIdx(doc,doc->head.next);
  copy.head.last=RecalcIdx(doc,doc->head.last);
  copy.cur_entry=RecalcIdx(doc,doc->cur_entry);
  copy.old_cur_entry=RecalcIdx(doc,doc->old_cur_entry);
  copy.win_task=doc->win_task==Fs;
  copy.mem_task=doc->mem_task==Fs;
  copy.owning_task=doc->owning_task==Fs;
  copy.bin_head.next=copy.bin_head.last=NULL;
  copy.undo_head.next=copy.undo_head.last=NULL;
  RecalcBytes(&copy,sizeof(CDoc));
  while (entry!=doc) {
    if (entry->next->last!=entry || entry->last->next!=entry)
      throw('RecalcQ');
    size=sizeof(CDocEntryBase);
    if (MSize(entry)>=sizeof(CDocEntry)) size=sizeof(CDocEntry);
    MemCpy(&node,entry,size);
    node.next=RecalcIdx(doc,entry->next);
    node.last=RecalcIdx(doc,entry->last);
    node.tag=ToBool(node.tag);
    if (size==sizeof(CDocEntry)) {
      node.aux_str=ToBool(node.aux_str);
      node.define_str=ToBool(node.define_str);
      node.html_link=ToBool(node.html_link);
      node.left_macro=ToBool(node.left_macro);
      node.right_macro=ToBool(node.right_macro);
      node.bin_ptr_link=ToBool(node.bin_ptr_link);
      node.bin_data=ToBool(node.bin_data);node.data=ToBool(node.data);
    }
    RecalcMix(size);RecalcBytes(&node,size);
    if (entry->tag) {
      RecalcMix(StrLen(entry->tag));
      RecalcBytes(entry->tag,StrLen(entry->tag));
    } else
      RecalcMix(-1);
    if (size==sizeof(CDocEntry)) {
      PutString(entry->aux_str);PutString(entry->define_str);
      PutString(entry->html_link);PutString(entry->left_macro);
      PutString(entry->right_macro);PutString(entry->bin_ptr_link);
    }
    entry=entry->next;
    if (++cnt>4096) throw('RecalcQ');
  }
  RecalcMix(cnt);
  RecalcMix(Fs->win_left);RecalcMix(Fs->win_right);
  RecalcMix(Fs->win_top);RecalcMix(Fs->win_bottom);
  RecalcMix(Fs->win_width);RecalcMix(Fs->win_height);
  recalc_cnt++;
}

U0 RecalcWindow(I64 seed)
{
  BreakUnlock;
  WinBorder(OFF);
  WinHorz(seed%3,15+seed%7);
  WinVert(seed%2,20+seed%5);
  Fs->scroll_x=(seed%3-1)*8;
  Fs->scroll_y=(seed%5-2)*8;
}

Raw(OFF);
U8 *put_text[19]={"",
      "plain",
      "a\tb\nc\r\nd",
      "a\r\r\n\r\rb",
      "$$$$",
      "$$$$$$",
      "$$RED$$red$$FG$$tail",
      "$$CL$$",
      "$$CL+H$$",
      "$$TX,\"tag\",A=\"aux\"$$",
      "$$CB,\"check\"$$",
      "$$TR,\"tree\"$$",
      "$$MA,LM=\"Run;\"$$",
      "$$UNKNOWN$$",
      "$$TX$$",
      "$$RED",
      "trailing$$",
      "a$$$$b$$$$c",
      "$$AN,\"here\"$$$$LK,\"there\",A=\"FI:Path\"$$"};

I64 PutFlags(I64 mask)
{
  I64 flags=0;
  if (mask&1) flags|=DOCF_PLAIN_TEXT;
  if (mask&2) flags|=DOCF_PLAIN_TEXT_TABS;
  if (mask&4) flags|=DOCF_NO_CURSOR;
  if (mask&8) flags|=DOCF_DBL_DOLLARS;
  return flags;
}

U0 PutCase(U8 *text,I64 mask,I64 pos,Bool fmt=FALSE)
{
  CDoc *doc=RecalcNew;
  CDocEntry *entry,*res;
  U8 *st=StrNew(text);
  doc->flags=PutFlags(mask);
  if (pos) {
    entry=RecalcEntry(doc,DOCT_TEXT|0x3C00,"before");
    doc->cur_entry=entry;
    doc->cur_col=pos-1;
    RecalcEntry(doc,DOCT_SOFT_NEW_LINE);
    RecalcEntry(doc,DOCT_TEXT|0x3C00,"after");
  }
  if (fmt) res=DocPrint(doc,"%s",st);
  else res=DocPutS(doc,st);
  if (StrCmp(st,text)) throw('PutInput');
  RecalcMix(RecalcIdx(doc,res));
  RecalcState(doc);
  RecalcDel(doc);
  Free(st);
}

U0 PutTest()
{
  I64 i,mask,term,pos,old_bits;
  U8 text[8];
  CDoc *doc,*old_doc;
  CDocEntry *entry;
  RecalcWindow(0);
  recalc_hash=0xCBF29CE484222325;recalc_cnt=0;
  RecalcMix(sizeof(char_bmp_zero_cr_nl_cursor));
  RecalcMix(sizeof(char_bmp_zero_tab_cr_nl_cursor));
  RecalcMix(sizeof(char_bmp_zero_tab_cr_nl_cursor_dollar));
  for (i=0;i<16;i++) {
    RecalcMix(char_bmp_zero_cr_nl_cursor[i]);
    RecalcMix(char_bmp_zero_tab_cr_nl_cursor[i]);
    RecalcMix(char_bmp_zero_tab_cr_nl_cursor_dollar[i]);
  }
  for (mask=0;mask<16;mask++)
    for (pos=0;pos<8;pos++)
      for (i=0;i<sizeof(put_text)/sizeof(U8 *);i++)
	PutCase(put_text[i],mask,pos,i&1);
  for (mask=0;mask<16;mask++)
    for (term=0;term<2;term++)
      for (i=0;i<256;i++) {
	text[0]='a';text[1]=i;text[2]='b';text[3]=0;
	if (term) {text[3]='\n';text[4]='z';text[5]=0;}
	PutCase(text,mask,0);
      }
  for (mask=0;mask<16;mask++) {
    text[0]='$$';text[1]=CH_CURSOR;text[2]='$$';text[3]=0;
    PutCase(text,mask,0);
    text[1]='C';text[2]=CH_CURSOR;text[3]='L';text[4]='$$';text[5]=0;
    PutCase(text,mask,2);
  }
  old_bits=char_bmp_zero_tab_cr_nl_cursor_dollar[0];
  Btr(char_bmp_zero_tab_cr_nl_cursor_dollar,'\t');
  PutCase("a\tb",0,2);
  char_bmp_zero_tab_cr_nl_cursor_dollar[0]=old_bits;
  doc=RecalcNew;
  RecalcMix(DocPutS(doc,NULL));RecalcState(doc);
  doc->doc_signature=0;
  RecalcMix(DocPutS(doc,"ignored"));
  RecalcMix(DocPrint(doc,"%s:%d","ignored",47));RecalcState(doc);
  doc->doc_signature=DOC_SIGNATURE_VAL;
  old_doc=Fs->put_doc;Fs->put_doc=doc;
  entry=DocPrint(NULL,"%s:%d","default",47);
  RecalcMix(RecalcIdx(doc,entry));RecalcState(doc);
  Fs->put_doc=NULL;
  RecalcMix(DocPutS(NULL,"ignored"));
  Fs->put_doc=old_doc;
  RecalcDel(doc);
  "Put:%016X:%d\n",recalc_hash,recalc_cnt;
}

PutTest;
