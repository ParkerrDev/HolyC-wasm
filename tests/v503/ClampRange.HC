//V5.03 KUtils.HC _CLAMP_I64 and _CLAMP_U64: compare lo, then hi.
"%d %d %d %d\n",ClampI64(5,0,9),ClampI64(-5,0,9),ClampI64(50,0,9),ClampI64(5,10,3);
"%d %d %d\n",ClampU64(5,0,9),ClampU64(50,0,9),ClampU64(5,10,3);
"%X %X\n",ClampU64(-1,0,10000),ClampU64(3,-10,-1);
"%X\n",ClampI64(-1,0,10000);
