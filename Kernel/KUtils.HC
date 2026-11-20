//V5.03 Kernel/KUtils.HC's LXchg routines are XCHG asm. A worker task
//runs until it yields, so the plain swap is as locked as XCHG.

public I64 LXchgI64(I64 *dst,I64 d)
{//Locked eXchange I64s.
  I64 res=*dst;
  *dst=d;
  return res;
}

public U16 LXchgU16(U16 *dst,U16 d)
{//Locked eXchange U16s.
  U16 res=*dst;
  *dst=d;
  return res;
}

public U32 LXchgU32(U32 *dst,U32 d)
{//Locked eXchange U32s.
  U32 res=*dst;
  *dst=d;
  return res;
}

public U8 LXchgU8(U8 *dst,U8 d)
{//Locked eXchange U8s.
  U8 res=*dst;
  *dst=d;
  return res;
}

U0 BFieldOrU32(U8 *bit_field,I64 bit,U32 pattern)
{//Or U32 into bit field.
  U64 *ptr=bit_field+bit>>3;
  *ptr|=pattern<<(bit&7);
}

//V5.03 KUtils.HC _CALLEXTSTR is asm: it finds name's HTT_FUN in Fs's hash
//table and calls it with the args. Here the symbol table of the jit holds
//the functions, and an Adam one the program did not link compiles then.
public I64 CallExtStr(U8 *name,...)
{//Search sym table for fun and pass it args.
  return __call_ext(name,argc,argv);
}

//V5.03 KUtils.HC _CALL is asm: CALL the address and give RAX, 0 for NULL.
//Here an address is a function's table entry, which takes any function at
//its count of args (codegen.js tableSig), so a U0 one gives 0.
public I64 Call(U8 *machine_code)
{//Call addr with no args.
  I64 (*fp_addr)();
  if (!machine_code)
    return 0;
  fp_addr=machine_code;
  return (*fp_addr)();
}
