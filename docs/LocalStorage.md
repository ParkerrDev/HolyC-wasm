# Native local storage

HolyC's declared integer width is not always its local storage width. V5.03
assigns up to eight integer registers to a function. A selected I8, U8, I16,
U16, I32, U32 or Bool local retains 64 bits; a memory local loads and stores its
declared width. The compiler warns about most such narrow register locals.
This is one reason Terry normally used I64 locals.

`local-storage.js` follows the reference scoring and register selection in
`Compiler/OptPass3.HC`, `OptLib.HC` and `Kernel/QSort.HC`. A local read or write
normally contributes an address calculation and a load/store. Eligible
members are sorted with the native unstable middle-pivot quicksort, including
zero-score unnamed parameters before trailing zero scores are removed. When
more than six candidates remain, two nonpointer registers are assigned first;
six general registers follow. There is no liveness-based register reuse.

Address-taking, dot/union access, `noreg`, floating locals without `reg`, and
functions with `try/catch` preserve their native exclusions. An array may
influence sorting and candidate counts without receiving a register. A
postfix cast of an array reads its stored first bytes; it does not take its
address. Static declarations are excluded from automatic register selection.
Explicit named x86 register assignment is rejected rather than approximated.

WASM locals represent the selected native register values. Spilled narrow
locals and spilled locals observed through narrower casts use real linear
memory. The generated frame layout and physical x86 register ABI are not
reproduced. `compileHolyC(source,{traceLocals:true})` returns a `localRegisters`
map for inspection, using original register IDs; this is a compile-time trace,
not a fabricated runtime compiler-symbol graph.

Assignments and increments preserve the selected storage width. Native memory
`*=` and `<<=` also retain their wide intermediate as the expression result,
while the stored value narrows; other measured compound stores and prefix
increments return the narrowed value. These distinctions are separately
observable in the proof matrix.

## Evidence

`npm run test:local-storage` compares 4,220 values and 2,699 native register
assignments from nine generated, source-bound fixtures. They cover all eight
primitive integer types plus Bool; initialization, assignment, parameters,
compound expression results, prefix/postfix increments, casts, spill pressure,
arrays, pointers, forced allocation, try/catch, anonymous and variadic
parameters, unused declarations and earlier global bindings. Identity/constant
arithmetic, used and discarded expressions, constant logical branches and a
constant switch are measured under 6/8/10-local pressure. The narrow-local
style-check findings are intentional inputs to this compatibility test.

The native wrapper inspects the real `CHashFun.member_lst_and_root` after
compilation. Only the unmodified program body runs in WASM. Captured frame
offsets and sizes are retained as evidence, but only register selection and
observable values are compared across the different ABIs. Each record binds
its generated source, wrapper, QEMU capture source and complete native output.
The native warnings remain in the saved output.

`node tests/local-storage-oracle.mjs` repeats the original V5.03 comparison;
`--record` refreshes evidence. Normal and `NOFOLD=1` address lowering pass the
same expectations. Eight negative controls independently break narrow stores,
spill width, equal-score ordering, try/catch exclusion, compound results,
spilled casts unnamed-parameter membership or discarded-expression references; each changes observable native
values. The original register/memory/product witness now has a strict equality
gate in `tests/integer-register.mjs`.

## Explicit remaining boundaries

`tests/probes/StaticLocalLifetime.HC` captures a separate inherited bug:
native static locals retain their contents between calls, while the current
host reinitializes them on each call. The allocation matrix checks their
REG_NONE exclusion and one invocation only; it does not claim persistence.

`tests/probes/LocalReturnWidth.HC` captures another distinct rule: a function
declared U8 can return 0x1000001FF from a register or direct I64 expression;
a noreg U8 load returns 0xFF. Current WASM return lowering truncates all three
to 0xFF. Its earlier array-cast register-scoring mismatch is fixed here. This
return ABI correction remains separate from allocation.
`node tests/local-storage-gaps.mjs` verifies both saved proofs and reports the
current differences with a failing exit status. `--native` repeats their
original V5.03 values; this known-gap check is separate from the passing suite.

Local aggregate initialization, explicit physical register assignments,
compiler option changes that disable register allocation, complete native
optimizer/assembly graph equivalence, uninitialized storage and all user-class
register behaviors are not certified by these finite fixtures. The original
source's register allocation depends on expression shape; passing these
cases is not a claim of universal native compilation equivalence.
