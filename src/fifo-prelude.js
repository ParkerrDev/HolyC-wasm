//V5.03 FIFOs; uninterrupted operations in the single-core cooperative host.
export const FIFO_TYPES_SRC=String.raw`
public class CFifoU8
{
  U8 *buf;
  I64 mask,in_ptr,out_ptr;
};

public class CFifoI64
{
  I64 *buf;
  I64 mask,in_ptr,out_ptr;
};
`;

export const FIFO_SRC=String.raw`
CFifoU8 *FifoU8New(I64 size,CTask *mem_task=NULL)
{//Create new fifo.
  CFifoU8 *f;
  if (!mem_task) mem_task=Fs;
  f=MAlloc(sizeof(CFifoU8),mem_task);
  try
    f->buf=MAlloc(size,mem_task);
  catch
    Free(f);
  f->mask=size-1;
  f->in_ptr=0;
  f->out_ptr=0;
  return f;
}

U0 FifoU8Del(CFifoU8 *f)
{//Free fifo.
  Free(f->buf);
  Free(f);
}

Bool FifoU8Ins(CFifoU8 *f,U8 b)
{//Insert U8 into fifo.
  I64 new_in_ptr;
  new_in_ptr=(f->in_ptr+1)&f->mask;
  if (new_in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    f->buf[f->in_ptr]=b;
    f->in_ptr=new_in_ptr;
    return TRUE;
  }
}

Bool FifoU8Rem(CFifoU8 *f,U8 *_b)
{//Remove U8 from fifo.
  if (f->in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    *_b=f->buf[f->out_ptr];
    f->out_ptr=(f->out_ptr+1)&f->mask;
    return TRUE;
  }
}

Bool FifoU8Peek(CFifoU8 *f,U8 *_b)
{//Peek at front of fifo and don't remove.
  if (f->in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    *_b=f->buf[f->out_ptr];
    return TRUE;
  }
}

U0 FifoU8Flush(CFifoU8 *f)
{//Flush fifo getting rid of all U8's.
  f->out_ptr=f->in_ptr;
}

I64 FifoU8Cnt(CFifoU8 *f)
{//Count of U8's in fifo.
  I64 res;
  if (f->out_ptr>f->in_ptr)
    res=f->mask+1-(f->out_ptr-f->in_ptr);
  else
    res=f->in_ptr-f->out_ptr;
  return res;
}

CFifoI64 *FifoI64New(I64 size,CTask *mem_task=NULL)
{//Create new fifo.
  CFifoI64 *f;
  if (!mem_task) mem_task=Fs;
  f=MAlloc(sizeof(CFifoI64),mem_task);
  try
    f->buf=MAlloc(size*sizeof(I64),mem_task);
  catch
    Free(f);
  f->mask=size-1;
  f->in_ptr=0;
  f->out_ptr=0;
  return f;
}

U0 FifoI64Del(CFifoI64 *f)
{//Free fifo.
  Free(f->buf);
  Free(f);
}

Bool FifoI64Ins(CFifoI64 *f,I64 q)
{//Insert I64 into fifo.
  I64 new_in_ptr;
  new_in_ptr=(f->in_ptr+1)&f->mask;
  if (new_in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    f->buf[f->in_ptr]=q;
    f->in_ptr=new_in_ptr;
    return TRUE;
  }
}

Bool FifoI64Rem(CFifoI64 *f,I64 *_q)
{//Remove I64 from fifo.
  if (f->in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    *_q=f->buf[f->out_ptr];
    f->out_ptr=(f->out_ptr+1)&f->mask;
    return TRUE;
  }
}

Bool FifoI64Peek(CFifoI64 *f,I64 *_q)
{//Peek at front of fifo and don't remove.
  if (f->in_ptr==f->out_ptr) {
    return FALSE;
  } else {
    *_q=f->buf[f->out_ptr];
    return TRUE;
  }
}

U0 FifoI64Flush(CFifoI64 *f)
{//Flush fifo getting rid of all I64's.
  f->out_ptr=f->in_ptr;
}

I64 FifoI64Cnt(CFifoI64 *f)
{//Count of I64's in fifo.
  I64 res;
  if (f->out_ptr>f->in_ptr)
    res=f->mask+1-(f->out_ptr-f->in_ptr);
  else
    res=f->in_ptr-f->out_ptr;
  return res;
}
`;
