//The JIT reads a global in #if; one no code writes keeps its value.
I64 cores=1;

#if cores>=4
"many\n";
#else
"one\n";
#endif
#if 1<<4==16 && cores
"if\n";
#endif
