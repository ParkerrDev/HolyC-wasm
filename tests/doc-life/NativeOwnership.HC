U0 NativeOwnership()
{
  CDoc *doc;
  CDocBin *bin;
  U8 *tag,*except;
  I64 before,span,delta,error=0;
  RecalcWindow(0);
  doc=RecalcNew;
  before=Fs->data_heap->used_u8s;
  bin=CAlloc(sizeof(CDocBin));
  bin->data=MAlloc(7);bin->size=7;bin->use_cnt=1;
  tag=bin->tag=StrNew("orphan");span=MSize2(tag);
  QueIns(bin,doc->bin_head.last);
  DocRst(doc,TRUE);
  delta=Fs->data_heap->used_u8s-before;
  if (delta && delta!=span) throw('LifeLeak');
  if (delta) Free(tag);
  "OrphanRemaining:%d\n",ToBool(delta);
  DocDel(doc);
  before=Fs->data_heap->used_u8s;
  doc=RecalcNew;span=MSize2(doc);
  doc->dollar_buf=MAlloc(84);
  doc->find_replace=CAlloc(sizeof(CEdFindText));
  BreakUnlock;
  Btr(&Fs->task_flags,TASKf_BREAK_TO_SHIFT_ESC);
  Bts(&Fs->task_flags,TASKf_PENDING_BREAK);
  except=Fs->next_except;
  try DocDel(doc);
  catch {
    error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  if (error!='Break' || Fs->next_except!=except ||
	Bt(&Fs->task_flags,TASKf_BREAK_LOCKED) ||
	Bt(&Fs->task_flags,TASKf_PENDING_BREAK)) throw('LifeBrk');
  delta=Fs->data_heap->used_u8s-before;
  if (delta && delta!=span) throw('LifeLeak');
  if (delta) Free(doc);
  "DeleteRemaining:%d\n",ToBool(delta);
}

Raw(OFF);
NativeOwnership;
