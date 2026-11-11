I64 fifo_sizes[11]={1,2,3,4,5,7,8,16,32,64,256};
I64 fifo_hash=0xCBF29CE484222325,fifo_state=1234;

U0 FifoHash(I64 n)
{
  fifo_hash=(fifo_hash^n)*0x100000001B3;
}

U0 FifoCheck()
{
  I64 i,j,n,op,q;
  U8 b;
  CFifoU8 *bytes;
  CFifoI64 *ints;
  "FifoLayout:%d:%d:%d:%d:%d:%d\n",sizeof(CFifoU8),sizeof(CFifoI64),
    offset(CFifoU8.buf),offset(CFifoU8.mask),
    offset(CFifoI64.in_ptr),offset(CFifoI64.out_ptr);
  for (i=0;i<11;i++) {
    n=fifo_sizes[i];
    bytes=FifoU8New(n);
    ints=FifoI64New(n);
    for (j=0;j<4096;j++) {
      fifo_state=fifo_state*6364136223846793005+1442695040888963407;
      op=fifo_state.u8[4]%8;
      b=0xAB;q=0xFEDCBA9876543210;
      switch (op) {
	case 0...3:
	  FifoHash(FifoU8Ins(bytes,fifo_state));
	  FifoHash(FifoI64Ins(ints,fifo_state));
	  break;
	case 4...5:
	  FifoHash(FifoU8Rem(bytes,&b));
	  FifoHash(FifoI64Rem(ints,&q));
	  FifoHash(b);FifoHash(q);
	  break;
	case 6:
	  FifoHash(FifoU8Peek(bytes,&b));
	  FifoHash(FifoI64Peek(ints,&q));
	  FifoHash(b);FifoHash(q);
	  break;
	case 7:
	  FifoU8Flush(bytes);FifoI64Flush(ints);
      }
      FifoHash(FifoU8Cnt(bytes));FifoHash(FifoI64Cnt(ints));
      FifoHash(bytes->in_ptr);FifoHash(bytes->out_ptr);
      FifoHash(ints->in_ptr);FifoHash(ints->out_ptr);
    }
    FifoU8Del(bytes);FifoI64Del(ints);
  }
  "Fifo:%016X\n",fifo_hash;
}

FifoCheck;
