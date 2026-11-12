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
