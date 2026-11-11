# Native integer return width

A narrow declared return type does not itself truncate a HolyC integer result.
V5.03 `OptPass3` marks only integer/F64 conversion at `IC_RETURN_VAL`;
`OptPass789A` moves the resulting integer operand into 64-bit RAX. A narrow
memory load has already narrowed or sign-extended its operand before that move.

For example, a function declared `U8` that directly returns the I64 value
`0x1000001FF` returns that full value. A register-selected U8 local can also
retain and return it. Returning a U8 value loaded from memory returns `0xFF`.
The caller still sees the declared type for later expression typing; this does
not change parameter conversion, memory stores or the type of the function.

Return lowering now converts an integer result to the full integer register
width. Ordinary load/store lowering decides memory width. F64/void and pointer
return lowering retain their existing paths.

`npm run test:return-width` compares 643 original V5.03 decisions in normal and
NOFOLD modes. The generated matrix covers all eight signed/unsigned primitive
integer types plus Bool, direct values, register and noreg locals, static/global
memory, postfix casts of registers and memory, relay and indirect calls,
constant returns, memory locals under try/catch, caller assignment/arithmetic,
finite F64-to-integer conversion and integer-to-F64 returns. Inputs include
negative values, values above each narrow width and I64_MIN. The original four
64-bit-register warnings remain in the complete source-bound native output.
Another 63 native caller-context vectors cover truth, negation, equality, signed
relations, logical short-circuit operators and chained comparisons. Each vector
records all seven decisions in separate bits, including returns whose low byte
is zero while the full register is nonzero.

`node tests/return-width-oracle.mjs` repeats the original QEMU comparison;
`--record` refreshes the generated source, runner, capture and output hashes.
Restoring the old declared-width coercion fails 174 values. The earlier native
static/return witnesses are now passing checks in
`tests/local-storage-regressions.mjs`, rather than known failing gaps.

This fixes the result width, not the entire physical calling convention. Native
U0 routines observed through an incompatible typed function pointer can expose
residual RAX; that existing boundary remains unsupported. Compiler symbol/code
heap graphs, general aggregate return conventions and complete x87 extended
precision are also outside this bounded proof. Consumer artifacts change and
need qualification with the matching compiler/runtime before deployment.
