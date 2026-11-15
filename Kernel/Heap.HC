//Heap ABI 1 is stored entirely in RAM so full-machine snapshots retain it.
#define HEAP_SIGNATURE 0x48435031
#define HEAP_ALIGN 16
#define HEAP_LIMIT 0x100000000

class CHeapBlk
{
  I64 span,prev_span;
  CHeapBlk *next,*last;
};

class CHeapCtrl
{
  U32 signature,locked;
  I64 end;
  CHeapBlk *free,*last;
};

I64 __memsize();
I64 __memgrow(I64 pages);

U0 HeapLock()
{
  CHeapCtrl *ctrl=HEAP_START;
  while (__a_cmpxchg32(HEAP_START+offset(CHeapCtrl.locked),0,1)) {}
  if (ctrl->signature!=HEAP_SIGNATURE) {
    ctrl->end=HEAP_START+sizeof(CHeapCtrl);
    ctrl->free=ctrl->last=0;
    ctrl->signature=HEAP_SIGNATURE;
  }
}

U0 HeapUnlock()
{
  __a_store32(HEAP_START+offset(CHeapCtrl.locked),0);
}

I64 HeapCursor()
{
  CHeapCtrl *ctrl=HEAP_START;
  if (ctrl->signature==HEAP_SIGNATURE) return ctrl->end;
  return HEAP_START;
}

U0 HeapRem(CHeapBlk *blk)
{
  CHeapCtrl *ctrl=HEAP_START;
  if (blk->last) blk->last->next=blk->next;
  else ctrl->free=blk->next;
  if (blk->next) blk->next->last=blk->last;
}

U0 HeapIns(CHeapBlk *blk)
{
  CHeapCtrl *ctrl=HEAP_START;
  blk->next=ctrl->free;
  blk->last=0;
  if (ctrl->free) ctrl->free->last=blk;
  ctrl->free=blk;
}

U8 *HeapAlloc(I64 size)
{//Return zero on exhaustion without consuming a block.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk,*tail;
  I64 need,span,end;
  if (size<0 || size>HEAP_LIMIT-sizeof(CHeapBlk)) return 0;
  if (!size) size=1;
  need=sizeof(CHeapBlk)+(size+HEAP_ALIGN-1)&-HEAP_ALIGN;
  HeapLock;
  end=ctrl->end;
  blk=ctrl->free;
  while (blk) {
    span=blk->span&-HEAP_ALIGN;
    if (span>=need) {
      HeapRem(blk);
      if (span-need>=sizeof(CHeapBlk)+HEAP_ALIGN) {
	tail=blk(U8 *)+need;
	blk->span=need+1;
	tail->span=span-need;
	tail->prev_span=need;
	if (blk(U8 *)+span<end)
	  (blk(U8 *)+span)(CHeapBlk *)->prev_span=span-need;
	else ctrl->last=tail;
	HeapIns(tail);
      } else blk->span=span+1;
      HeapUnlock;
      return blk+1;
    }
    blk=blk->next;
  }
  if (end+need>HEAP_LIMIT || end+need>__memsize*65536 &&
      __memgrow((end+need+65535)/65536-__memsize)<0) {
    HeapUnlock;
    return 0;
  }
  blk=end;
  blk->span=need+1;
  if (ctrl->last) blk->prev_span=ctrl->last->span&-HEAP_ALIGN;
  else blk->prev_span=0;
  ctrl->end=end+need;
  ctrl->last=blk;
  HeapUnlock;
  return blk+1;
}

CHeapBlk *HeapBlk(U8 *ptr)
{//The caller holds the heap lock.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk=ptr-sizeof(CHeapBlk);
  I64 span;
  if (blk(U64)&(HEAP_ALIGN-1) || blk<HEAP_START+sizeof(CHeapCtrl) ||
      blk(U64)>ctrl->end-sizeof(CHeapBlk)) return 0;
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
  HeapLock;
  if (blk=HeapBlk(ptr)) res=blk->span&-HEAP_ALIGN;
  HeapUnlock;
  return res;
}

I64 HeapFree(U8 *ptr)
{
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk,*next;
  I64 span,prev;
  if (!ptr) return 0;
  HeapLock;
  if (!(blk=HeapBlk(ptr))) {
    HeapUnlock;
    return -1;
  }
  span=blk->span&-HEAP_ALIGN;
  prev=blk->prev_span;
  blk->span=span;
  if (prev && !((blk(U8 *)-prev)(CHeapBlk *)->span&1)) {
    blk=blk(U8 *)-prev;
    HeapRem(blk);
    span+=blk->span&-HEAP_ALIGN;
    prev=blk->prev_span;
  }
  next=blk(U8 *)+span;
  if (next<ctrl->end && !(next->span&1)) {
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
  HeapUnlock;
  return 0;
}
