//The heap's classes, for Kernel/Heap.HC and for programs, as in V5.03's
//KernelA.HH. RAM is under 4 Gig, so a U32 holds a span or a ptr.

class CHeapBlk
{//A free blk is on a pool list, a used one on its heap's list.
  I64 span; //Bit 0 if used, bit 1 if on a task's heap_hash.
  U32 prev_span,hc; //hc is V5.03's CMemUsed.hc, zero for no heap.
  CHeapBlk *next,*last;
};

#define HEAP_ALIGN 16
#define HEAP_HASH_BITS 10
#define HEAP_HASH_SPAN (1<<HEAP_HASH_BITS)
#define HEAP_BINS	86 //64 small bins and 22 size classes below 4 GiB.

class CBlkPool
{//Memory the heaps take blks from.
  I64 alloced_u8s,used_u8s;
  CHeapBlk *bins[HEAP_BINS];
};

#define HEAP_CTRL_SIGNATURE_VAL	'HcSV'

class CHeapCtrl
{//A task's heap: the blks it took from the pool.
  CBlkPool *bp;
  U32 hc_signature,pad;
  I64 locked_flags,alloced_u8s,used_u8s;
  CTask *mem_task;
  CHeapBlk *next_um,*last_um;
  CHeapBlk *heap_hash[HEAP_HASH_SPAN/HEAP_ALIGN];
};
