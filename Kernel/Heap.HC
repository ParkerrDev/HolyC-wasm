//Heap ABI 1 is stored entirely in RAM so full-machine snapshots retain it.
//Free blks sit on the pool's size lists, as V5.03's heap_hash: one list for
//each HEAP_ALIGN of span under HEAP_HASH_SPAN, then one for each power of two.
//A used blk is on its heap's list (Heap.HH CHeapCtrl), as V5.03's
//CMemUsed.hc names the task heap it came from, and a task's death frees it.
#define HEAP_SIGNATURE_OLD 0x48435031 //One first-fit free list.
#define HEAP_SIGNATURE_BINS 0x48435032 //Pool contains only bin heads.
#define HEAP_SIGNATURE 0x48435033
#define HEAP_LIMIT 0x100000000

class CHeap
{//At HEAP_START.
  U32 signature,locked;
  I64 end;
  CBlkPool *bp; //HEAP_SIGNATURE_OLD's free list head.
  CHeapBlk *last;
};

I64 __memsize();
I64 __memgrow(I64 pages);

I64 HeapBin(I64 span)
{//Free list of a span.
  I64 res=HEAP_HASH_SPAN/HEAP_ALIGN;
  if (span<HEAP_HASH_SPAN) return span/HEAP_ALIGN;
  span>>=HEAP_HASH_BITS;
  while (span>1) {
    span>>=1;
    res++;
  }
  return res;
}

U0 HeapRem(CHeapBlk *blk)
{
  CHeap *ctrl=HEAP_START;
  if (blk->last) blk->last->next=blk->next;
  else ctrl->bp->bins[HeapBin(blk->span&-HEAP_ALIGN)]=blk->next;
  if (blk->next) blk->next->last=blk->last;
}

U0 HeapIns(CHeapBlk *blk)
{
  CHeap *ctrl=HEAP_START;
  CHeapBlk **_head=ctrl->bp->bins+HeapBin(blk->span&-HEAP_ALIGN);
  blk->next=*_head;
  blk->last=0;
  if (*_head) (*_head)->last=blk;
  *_head=blk;
}

CHeapBlk *HeapEnd(I64 need)
{//Take a used blk from the end, or zero.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk;
  I64 end=ctrl->end;
  if (end+need>HEAP_LIMIT || end+need>__memsize*65536 &&
      __memgrow((end+need+65535)/65536-__memsize)<0)
    return 0;
  blk=end;
  blk->span=need+1;
  blk->hc=0;
  blk->next=blk->last=0;
  if (ctrl->last) blk->prev_span=ctrl->last->span&-HEAP_ALIGN;
  else blk->prev_span=0;
  ctrl->end=end+need;
  ctrl->last=blk;
  if (ctrl->signature==HEAP_SIGNATURE && ctrl->bp) //Not the old free list.
    ctrl->bp->alloced_u8s=__memsize*65536-HEAP_START;
  return blk;
}

U0 HeapUnlock()
{
  __a_store32(HEAP_START+offset(CHeap.locked),0);
}

I64 HeapInit(CHeapBlk *next)
{//Put the pool at the end and next's list in it, or zero.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk;
  CBlkPool *bp;
  I64 i;
  if (!(blk=HeapEnd(sizeof(CHeapBlk)+sizeof(CBlkPool))))
    return 0;
  ctrl->bp=bp=blk+1;
  for (i=0;i<HEAP_BINS;i++)
    bp->bins[i]=0;
  bp->alloced_u8s=__memsize*65536-HEAP_START;
  bp->used_u8s=ctrl->end-HEAP_START;
  while (blk=next) {
    next=blk->next;
    bp->used_u8s-=blk->span;
    HeapIns(blk);
  }
  ctrl->signature=HEAP_SIGNATURE;
  return 1;
}

I64 HeapLock()
{//Zero, unlocked, if there is no room for the pool.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk,*next=0;
  I64 i;
  while (__a_cmpxchg32(HEAP_START+offset(CHeap.locked),0,1)) {}
  if (ctrl->signature==HEAP_SIGNATURE) {
    if (ctrl->bp) return 1;
  } else if (ctrl->signature==HEAP_SIGNATURE_BINS && ctrl->bp) {
//Full snapshots contain no suspended task owners. The old 88-slot pool used
//only 86 bins below 4 GiB. Move them up two slots to make room for the counts.
    for (i=HEAP_BINS-1;i>=0;i--)
      ctrl->bp->bins[i]=ctrl->bp(CHeapBlk **)[i];
    ctrl->bp->alloced_u8s=__memsize*65536-HEAP_START;
    ctrl->bp->used_u8s=sizeof(CHeap);
    for (blk=HEAP_START+sizeof(CHeap);blk<ctrl->end;
          blk=blk(U8 *)+(blk->span&-HEAP_ALIGN))
      if (blk->span&1) {
        blk->next=blk->last=0;
        blk->hc=0;
        ctrl->bp->used_u8s+=blk->span&-HEAP_ALIGN;
      }
    ctrl->signature=HEAP_SIGNATURE;
    return 1;
  } else if (ctrl->signature==HEAP_SIGNATURE_OLD) {
    next=ctrl->bp;
    for (blk=HEAP_START+sizeof(CHeap);blk<ctrl->end;
	  blk=blk(U8 *)+blk->span&-HEAP_ALIGN)
      if (blk->span&1) {
	blk->hc=0;
	blk->next=blk->last=0;
      }
  } else {
    ctrl->end=HEAP_START+sizeof(CHeap);
    ctrl->last=0;
  }
  if (HeapInit(next)) return 1;
  HeapUnlock;
  return 0;
}

I64 HeapCursor()
{
  CHeap *ctrl=HEAP_START;
  if (ctrl->signature==HEAP_SIGNATURE || ctrl->signature==HEAP_SIGNATURE_BINS ||
	ctrl->signature==HEAP_SIGNATURE_OLD) return ctrl->end;
  return HEAP_START;
}

CHeapBlk *HeapUm(CHeapCtrl *hc)
{//The head of hc's list, as a blk. Not &hc->next_um: that takes a frame.
  return hc(U8 *)+offset(CHeapCtrl.next_um)-offset(CHeapBlk.next);
}

U0 HeapOwnIns(CHeapBlk *blk,CHeapCtrl *hc)
{//Put a used blk on hc's list, if any.
  I64 span=blk->span&-HEAP_ALIGN;
  blk->hc=hc;
  if (hc) {
    blk->next=HeapUm(hc);
    blk->last=hc->last_um;
    hc->last_um->next=blk;
    hc->last_um=blk;
    hc->used_u8s+=span;
    hc->alloced_u8s+=span;
  } else
    blk->next=blk->last=0;
}

U0 HeapOwnRem(CHeapBlk *blk)
{//Take a used blk off its heap's list, if any.
  CHeapCtrl *hc=blk->hc;
  I64 span=blk->span&-HEAP_ALIGN;
  if (hc) {
    blk->last->next=blk->next;
    blk->next->last=blk->last;
    blk->next=blk->last=0;
    blk->hc=0;
    hc->used_u8s-=span;
    hc->alloced_u8s-=span;
  }
}

U8 *HeapUse(CHeapBlk *blk,CHeapCtrl *hc)
{//Give a blk HeapAlloc took to hc, and unlock.
  CHeap *ctrl=HEAP_START;
  HeapOwnIns(blk,hc);
  ctrl->bp->used_u8s+=blk->span&-HEAP_ALIGN;
  HeapUnlock;
  return blk+1;
}

U8 *HeapAlloc(I64 size,CHeapCtrl *hc=0)
{//Return zero on exhaustion without consuming a blk.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk,*tail;
  I64 i,need,span;
  if (size<0 || size>HEAP_LIMIT-sizeof(CHeapBlk)) return 0;
  if (!size) size=1;
  need=sizeof(CHeapBlk)+(size+HEAP_ALIGN-1)&-HEAP_ALIGN;
  if (!HeapLock) return 0;
  if (hc && need<HEAP_HASH_SPAN && (blk=hc->heap_hash[need/HEAP_ALIGN])) {
    hc->heap_hash[need/HEAP_ALIGN]=blk->next;
    hc->alloced_u8s-=need;
    blk->span=need+1;
    return HeapUse(blk,hc);
  }
  for (i=HeapBin(need);i<HEAP_BINS;i++)
    for (blk=ctrl->bp->bins[i];blk;blk=blk->next) {
      span=blk->span&-HEAP_ALIGN;
      if (span>=need) {
	HeapRem(blk);
	if (span-need>=sizeof(CHeapBlk)+HEAP_ALIGN) {
	  tail=blk(U8 *)+need;
	  blk->span=need+1;
	  tail->span=span-need;
	  tail->prev_span=need;
	  if (blk(U8 *)+span<ctrl->end)
	    (blk(U8 *)+span)(CHeapBlk *)->prev_span=span-need;
	  else ctrl->last=tail;
	  HeapIns(tail);
	} else blk->span=span+1;
	return HeapUse(blk,hc);
      }
    }
  if (blk=HeapEnd(need))
    return HeapUse(blk,hc);
  HeapUnlock;
  return 0;
}

CHeapBlk *HeapBlk(U8 *ptr)
{//The caller holds the heap lock.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk=ptr-sizeof(CHeapBlk);
  I64 span;
  if (blk(U64)&(HEAP_ALIGN-1) || blk<HEAP_START+sizeof(CHeap) ||
      blk(U64)>ctrl->end-sizeof(CHeapBlk) || ptr==ctrl->bp(U8 *)) return 0;
  span=blk->span&-HEAP_ALIGN;
  if (!(blk->span&1) || span<sizeof(CHeapBlk)+HEAP_ALIGN ||
      span>ctrl->end-blk(U64)) return 0;
  return blk;
}

I64 HeapSize(U8 *ptr)
{//Return the internal span, or -1 for an invalid allocation.
  CHeapBlk *blk;
  I64 res=-1;
  if (!ptr) return 0;
  if (!HeapLock) return -1;
  if (blk=HeapBlk(ptr)) res=blk->span&-HEAP_ALIGN;
  HeapUnlock;
  return res;
}

U0 HeapRelease(CHeapBlk *blk)
{//Return a block to the shared pool. The caller holds the lock.
  CHeap *ctrl=HEAP_START;
  CHeapBlk *next;
  I64 span=blk->span&-HEAP_ALIGN,prev;
  prev=blk->prev_span;
  blk->span=span;
  if (prev && !((blk(U8 *)-prev)(CHeapBlk *)->span&3)) {
    blk=blk(U8 *)-prev;
    HeapRem(blk);
    span+=blk->span&-HEAP_ALIGN;
    prev=blk->prev_span;
  }
  next=blk(U8 *)+span;
  if (next<ctrl->end && !(next->span&3)) {
    HeapRem(next);
    span+=next->span&-HEAP_ALIGN;
  }
  if (blk(U8 *)+span==ctrl->end) {
    ctrl->end=blk;
    if (prev) ctrl->last=blk(U8 *)-prev;
    else ctrl->last=0;
  } else {
    blk->span=span;
    (blk(U8 *)+span)(CHeapBlk *)->prev_span=span;
    HeapIns(blk);
  }
  blk=ctrl->bp(U8 *)-sizeof(CHeapBlk);
  next=HEAP_START+sizeof(CHeap);
  if (ctrl->last==blk && (blk==next ||
	blk(U8 *)-blk->prev_span==next && !(next->span&3))) {
//Nothing is left but the pool: the next HeapLock makes it again, here.
    ctrl->end=next;
    ctrl->last=0;
    ctrl->bp=0;
  }
}

I64 HeapFree(U8 *ptr)
{
  CHeap *ctrl=HEAP_START;
  CHeapBlk *blk;
  CHeapCtrl *hc;
  I64 span,i;
  if (!ptr) return 0;
  if (!HeapLock) return -1;
  if (!(blk=HeapBlk(ptr))) {
    HeapUnlock;
    return -1;
  }
  hc=blk->hc;
  span=blk->span&-HEAP_ALIGN;
  HeapOwnRem(blk);
  ctrl->bp->used_u8s-=span;
  if (hc && span<HEAP_HASH_SPAN) {
    i=span/HEAP_ALIGN;
    blk->span=span+2;
    blk->next=hc->heap_hash[i];
    hc->heap_hash[i]=blk;
    hc->alloced_u8s+=span;
  } else
    HeapRelease(blk);
  HeapUnlock;
  return 0;
}

CBlkPool *HeapBP()
{//The pool, made if there is none, or zero.
  CHeap *ctrl=HEAP_START;
  CBlkPool *res;
  if (!HeapLock) return 0;
  res=ctrl->bp;
  HeapUnlock;
  return res;
}

CHeapCtrl *HeapCtrlNew()
{//An empty heap, or zero. V5.03's HeapCtrlInit; TaskHostHeap sets mem_task.
  CHeapCtrl *hc=HeapAlloc(sizeof(CHeapCtrl));
  I64 i;
  if (hc) {
    for (i=0;i<HEAP_HASH_SPAN/HEAP_ALIGN;i++) hc->heap_hash[i]=0;
    hc->bp=HEAP_START(CHeap *)->bp;
    hc->hc_signature=HEAP_CTRL_SIGNATURE_VAL;
    hc->pad=0;
    hc->locked_flags=hc->alloced_u8s=hc->used_u8s=0;
    hc->mem_task=0;
    hc->next_um=hc->last_um=HeapUm(hc);
  }
  return hc;
}

U0 HeapCacheRelease(CHeapCtrl *hc)
{//Return the heap's cached blocks to the shared pool while locked.
  CHeapBlk *blk,*next;
  I64 i;
  for (i=0;i<HEAP_HASH_SPAN/HEAP_ALIGN;i++) {
    blk=hc->heap_hash[i];
    hc->heap_hash[i]=0;
    while (blk) {
      next=blk->next;
      hc->alloced_u8s-=blk->span&-HEAP_ALIGN;
      HeapRelease(blk);
      blk=next;
    }
  }
}

U0 HeapCtrlTrim(CHeapCtrl *hc)
{
  if (!HeapLock) return;
  HeapCacheRelease(hc);
  HeapUnlock;
}

I64 HeapCtrlDel(CHeapCtrl *hc)
{//Free a heap the host emptied, so nothing allocs off it again.
  CHeapBlk *blk;
  if (!HeapLock) return -1;
  if (!(blk=HeapBlk(hc)) || hc->hc_signature!=HEAP_CTRL_SIGNATURE_VAL ||
      hc->next_um!=HeapUm(hc)) {
    HeapUnlock;
    return -1;
  }
  HeapCacheRelease(hc);
  hc->hc_signature=0;
  HEAP_START(CHeap *)->bp->used_u8s-=blk->span&-HEAP_ALIGN;
  HeapRelease(blk);
  HeapUnlock;
  return 0;
}

I64 HeapOwn(U8 *ptr,CHeapCtrl *hc)
{//Give an allocation to hc, or to no heap; -1 if ptr is invalid.
  CHeapBlk *blk;
  if (!ptr) return 0;
  if (!HeapLock) return -1;
  if (!(blk=HeapBlk(ptr))) {
    HeapUnlock;
    return -1;
  }
  HeapOwnRem(blk);
  HeapOwnIns(blk,hc);
  HeapUnlock;
  return 0;
}

I64 HeapCtrlCnt(CHeapCtrl *hc)
{//Count of hc's allocations.
  CHeapBlk *blk,*um=HeapUm(hc);
  I64 res=0;
  if (!HeapLock) return 0;
  for (blk=hc->next_um;blk!=um;blk=blk->next)
    res++;
  HeapUnlock;
  return res;
}

U8 *HeapCtrlFirst(CHeapCtrl *hc)
{//One of hc's allocations, or zero: the host frees them one by one.
  if (hc->next_um==HeapUm(hc)) return 0;
  return hc->next_um+1;
}
