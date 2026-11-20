//Heap ABI 1 is stored entirely in RAM so full-machine snapshots retain it.
//Free blocks sit on size lists, as V5.03's heap_hash: one list for each
//HEAP_ALIGN of span under HEAP_HASH_SPAN, then one for each power of two.
//A used block's next and last link it on its owner's list, as V5.03's
//CMemUsed.hc names the task heap it came from: an owner is a sentinel CHeapBlk
//in a block of its own, and a task's death frees its list.
#define HEAP_SIGNATURE_OLD 0x48435031 //One first-fit free list.
#define HEAP_SIGNATURE 0x48435032
#define HEAP_ALIGN 16
#define HEAP_LIMIT 0x100000000
#define HEAP_HASH_BITS 10
#define HEAP_HASH_SPAN (1<<HEAP_HASH_BITS)
#define HEAP_BINS 88
#define HEAP_DEAD 0x48454144 //HeapFreeDead's mark, xor the ptr.

class CHeapBlk
{
  I64 span,prev_span;
  CHeapBlk *next,*last;
};

class CHeapCtrl
{
  U32 signature,locked;
  I64 end;
  CHeapBlk **bins,*last; //HEAP_SIGNATURE_OLD's free list head.
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
  CHeapCtrl *ctrl=HEAP_START;
  if (blk->last) blk->last->next=blk->next;
  else ctrl->bins[HeapBin(blk->span&-HEAP_ALIGN)]=blk->next;
  if (blk->next) blk->next->last=blk->last;
}

U0 HeapIns(CHeapBlk *blk)
{
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk **_head=ctrl->bins+HeapBin(blk->span&-HEAP_ALIGN);
  blk->next=*_head;
  blk->last=0;
  if (*_head) (*_head)->last=blk;
  *_head=blk;
}

CHeapBlk *HeapEnd(I64 need)
{//Take a used block from the end, or zero.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk;
  I64 end=ctrl->end;
  if (end+need>HEAP_LIMIT || end+need>__memsize*65536 &&
      __memgrow((end+need+65535)/65536-__memsize)<0)
    return 0;
  blk=end;
  blk->span=need+1;
  blk->next=blk->last=0;
  if (ctrl->last) blk->prev_span=ctrl->last->span&-HEAP_ALIGN;
  else blk->prev_span=0;
  ctrl->end=end+need;
  ctrl->last=blk;
  return blk;
}

U0 HeapUnlock()
{
  __a_store32(HEAP_START+offset(CHeapCtrl.locked),0);
}

I64 HeapInit(CHeapBlk *next)
{//Put the free lists at the end and next's list on them, or zero.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk;
  I64 i;
  if (!(blk=HeapEnd(sizeof(CHeapBlk)+HEAP_BINS*sizeof(CHeapBlk *))))
    return 0;
  ctrl->bins=blk+1;
  for (i=0;i<HEAP_BINS;i++)
    ctrl->bins[i]=0;
  while (blk=next) {
    next=blk->next;
    HeapIns(blk);
  }
  ctrl->signature=HEAP_SIGNATURE;
  return 1;
}

I64 HeapLock()
{//Zero, unlocked, if there is no room for the free lists.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk,*next=0;
  while (__a_cmpxchg32(HEAP_START+offset(CHeapCtrl.locked),0,1)) {}
  if (ctrl->signature==HEAP_SIGNATURE) {
    if (ctrl->bins) return 1;
  } else if (ctrl->signature==HEAP_SIGNATURE_OLD) {
    next=ctrl->bins;
    for (blk=HEAP_START+sizeof(CHeapCtrl);blk<ctrl->end;
	  blk=blk(U8 *)+blk->span&-HEAP_ALIGN)
      if (blk->span&1)
	blk->next=blk->last=0;
  } else {
    ctrl->end=HEAP_START+sizeof(CHeapCtrl);
    ctrl->last=0;
  }
  if (HeapInit(next)) return 1;
  HeapUnlock;
  return 0;
}

I64 HeapCursor()
{
  CHeapCtrl *ctrl=HEAP_START;
  if (ctrl->signature==HEAP_SIGNATURE ||
	ctrl->signature==HEAP_SIGNATURE_OLD) return ctrl->end;
  return HEAP_START;
}

U0 HeapOwnIns(CHeapBlk *blk,CHeapBlk *owner)
{//Link a used blk on owner's list, if any.
  if (blk->next=owner) {
    blk->last=owner->last;
    owner->last->next=blk;
    owner->last=blk;
  } else blk->last=0;
}

U0 HeapOwnRem(CHeapBlk *blk)
{//Take a used blk off its owner's list, if any.
  if (blk->next) {
    blk->last->next=blk->next;
    blk->next->last=blk->last;
    blk->next=blk->last=0;
  }
}

U8 *HeapAlloc(I64 size,CHeapBlk *owner=0)
{//Return zero on exhaustion without consuming a block.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk,*tail;
  I64 i,need,span;
  if (size<0 || size>HEAP_LIMIT-sizeof(CHeapBlk)) return 0;
  if (!size) size=1;
  need=sizeof(CHeapBlk)+(size+HEAP_ALIGN-1)&-HEAP_ALIGN;
  if (!HeapLock) return 0;
  for (i=HeapBin(need);i<HEAP_BINS;i++)
    for (blk=ctrl->bins[i];blk;blk=blk->next) {
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
	HeapOwnIns(blk,owner);
	HeapUnlock;
	*(blk+1)(I64 *)=0; //No HeapFreeDead mark.
	return blk+1;
      }
    }
  if (blk=HeapEnd(need))
    HeapOwnIns(blk,owner);
  HeapUnlock;
  if (blk) {
    *(blk+1)(I64 *)=0;
    return blk+1;
  }
  return 0;
}

CHeapBlk *HeapBlk(U8 *ptr)
{//The caller holds the heap lock.
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk=ptr-sizeof(CHeapBlk);
  I64 span;
  if (blk(U64)&(HEAP_ALIGN-1) || blk<HEAP_START+sizeof(CHeapCtrl) ||
      blk(U64)>ctrl->end-sizeof(CHeapBlk) || ptr==ctrl->bins(U8 *)) return 0;
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

I64 HeapFree(U8 *ptr)
{
  CHeapCtrl *ctrl=HEAP_START;
  CHeapBlk *blk,*next;
  I64 span,prev;
  if (!ptr) return 0;
  if (!HeapLock) return -1;
  if (!(blk=HeapBlk(ptr))) {
    HeapUnlock;
//V5.03 frees a dead task's heap whole, and a Free into it then has no effect.
    if (!(ptr(U64)&(HEAP_ALIGN-1)) && ptr>=HEAP_START+sizeof(CHeapCtrl) &&
	  ptr(U64)<=__memsize*65536-sizeof(I64) &&
	  *ptr(I64 *)==HEAP_DEAD^ptr(I64))
      return 0;
    return -1;
  }
  HeapOwnRem(blk);
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
  blk=ctrl->bins(U8 *)-sizeof(CHeapBlk);
  next=HEAP_START+sizeof(CHeapCtrl);
  if (ctrl->last==blk && (blk==next ||
	blk(U8 *)-blk->prev_span==next && !(next->span&1))) {
//Nothing is left but the lists: the next HeapLock makes them again.
    ctrl->end=next;
    ctrl->last=0;
    ctrl->bins=0;
  }
  HeapUnlock;
  return 0;
}

I64 HeapFreeDead(U8 *ptr)
{//Free a dying task's allocation, so a later Free of it is a no-op.
  I64 res=HeapFree(ptr);
  if (!res && ptr) *ptr(I64 *)=HEAP_DEAD^ptr(I64);
  return res;
}

CHeapBlk *HeapOwnerNew()
{//An empty owner's list, or zero.
  CHeapBlk *owner=HeapAlloc(sizeof(CHeapBlk));
  if (owner) {
    owner->span=owner->prev_span=0;
    owner->next=owner->last=owner;
  }
  return owner;
}

I64 HeapOwn(U8 *ptr,CHeapBlk *owner)
{//Give an allocation to owner, or to nobody; -1 if ptr is invalid.
  CHeapBlk *blk;
  if (!ptr) return 0;
  if (!HeapLock) return -1;
  if (!(blk=HeapBlk(ptr))) {
    HeapUnlock;
    return -1;
  }
  HeapOwnRem(blk);
  HeapOwnIns(blk,owner);
  HeapUnlock;
  return 0;
}

I64 HeapOwnerCnt(CHeapBlk *owner)
{//Count of owner's allocations.
  CHeapBlk *blk;
  I64 res=0;
  if (!HeapLock) return 0;
  for (blk=owner->next;blk!=owner;blk=blk->next)
    res++;
  HeapUnlock;
  return res;
}

U8 *HeapOwnerFirst(CHeapBlk *owner)
{//One of owner's allocations, or zero: the host frees them one by one.
  if (owner->next==owner) return 0;
  return owner->next+1;
}
