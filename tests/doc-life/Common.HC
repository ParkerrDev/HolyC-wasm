U0 LifeState(CDoc *doc)
{
  CDoc copy;
  if (doc->head.next!=doc || doc->head.last!=doc ||
	doc->bin_head.next!=&doc->bin_head ||
	doc->bin_head.last!=&doc->bin_head ||
	doc->undo_head.next!=&doc->undo_head ||
	doc->undo_head.last!=&doc->undo_head) throw('LifeQue');
  MemCpy(&copy,doc,sizeof(CDoc));
  copy.head.next=copy.head.last=NULL;
  copy.head.tag=ToBool(copy.head.tag);
  copy.cur_entry=RecalcIdx(doc,doc->cur_entry);
  copy.old_cur_entry=RecalcIdx(doc,doc->old_cur_entry);
  copy.dollar_buf=ToBool(copy.dollar_buf);
  copy.find_replace=ToBool(copy.find_replace);
  copy.win_task=ToBool(copy.win_task);
  copy.mem_task=ToBool(copy.mem_task);
  copy.owning_task=ToBool(copy.owning_task);
  copy.left_click_link=ToBool(copy.left_click_link);
  copy.right_click_link=ToBool(copy.right_click_link);
  copy.user_put_data=ToBool(copy.user_put_data);
  copy.parent_doc=ToBool(copy.parent_doc);
  copy.bin_head.next=copy.bin_head.last=NULL;
  copy.undo_head.next=copy.undo_head.last=NULL;
  RecalcBytes(&copy,sizeof(CDoc));
  if (doc->head.tag) RecalcBytes(doc->head.tag,StrLen(doc->head.tag));
  if (doc->dollar_buf) RecalcBytes(doc->dollar_buf,doc->dollar_buf_size);
  if (doc->find_replace)
    RecalcBytes(doc->find_replace,sizeof(CEdFindText));
  recalc_cnt++;
}

I64 LifeLink(CDoc *,CDocEntry *)
{
  throw('LifeCall');
  return 0;
}

U0 LifeFill(CDoc *doc,I64 seed,Bool old)
{
  CDocEntry *entry;
  CDocUndo *undo;
  CDocBin *bin;
  I64 i;
  doc->flags=0x123F00|seed;
  doc->head.tag="head";
  doc->head.de_flags=0x12345;
  doc->left_click_link=&LifeLink;
  doc->right_click_link=&LifeLink;
  doc->parent_doc=doc;
  doc->user_put_data="user";
  doc->user_data=seed*123;
  doc->dollar_buf_size=84;
  doc->dollar_buf=MAlloc(84,doc->mem_task);
  MemSet(doc->dollar_buf,seed,84);doc->dollar_buf_ptr=33;
  doc->find_replace=CAlloc(sizeof(CEdFindText),doc->mem_task);
  MemSet(doc->find_replace,seed,sizeof(CEdFindText));
  doc->cur_bin_num=42;
  doc->settings_head.final_u32_attr=0x12345678;
  doc->settings_head.left_margin=-123;
  doc->settings_head.page_len=0;
  doc->old_cur_col=seed;doc->cmd_U8=123;
  doc->undo_head.size=999;doc->undo_head.time_stamp=888;
  doc->bin_head.num=123;doc->bin_head.use_cnt=77;
  if (old) {
    bin=CAlloc(sizeof(CDocBin),doc->mem_task);
    bin->data=MAlloc(11,doc->mem_task);bin->size=11;bin->use_cnt=2;
    bin->tag=StrNew("shared",doc->mem_task);
    QueIns(bin,doc->bin_head.last);
    for (i=0;i<2;i++) {
      entry=RecalcEntry(doc,DOCT_SPRITE,"bin",,DOCEF_HAS_BIN);
      entry->bin_data=bin;
      doc->cur_entry=doc->old_cur_entry=entry;
      undo=CAlloc(sizeof(CDocUndo),doc->mem_task);
      undo->body=MAlloc(17,doc->mem_task);undo->size=17;
      QueIns(undo,doc->undo_head.last);doc->undo_cnt++;
    }
    bin=CAlloc(sizeof(CDocBin),doc->mem_task);
    bin->data=MAlloc(9,doc->mem_task);bin->size=9;bin->use_cnt=1;
    QueIns(bin,doc->bin_head.last);
  }
}
