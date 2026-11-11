# Static local lifetime

A static local owns one cell for the compiled function. V5.03 initializes the
cell while defining the function, including functions that are never called.
Calls, recursion and child tasks share it. Redefining a function creates new
cells; an earlier function pointer retains the earlier implementation and cells.

The compiler now collects static cells separately from call-frame locals and
places their initializers in declaration order. Globals and function defaults
use that same ordering path. A static declared after a top-level statement is
initialized after that statement, before any later statements. Failed
initialization poisons subsequent module entry instead of running with partial
state. Values stored in static cells retain their declared memory width.

Initializer scope includes prior/self static declarations and permits `sizeof`
automatic locals. Global bindings still follow declaration identity. Explicitly
sized arrays, strings, scalar and packed-class initializers use the existing
ordinary memory initialization machinery. Cells have native minimum eight-byte
alignment. They are hidden from the returned public-global map.

`npm run test:static-local` checks original V5.03 output for definition-time
side effects, unused functions, source order, redefinition, persistent array and
class mutation, recursion, independent addresses, narrow wrapping, alignment,
parent/child sharing and failure at definition time. It also checks independent
WASM instances, repeated exported calls, the initialization once guard, actual
JSPI ownership/cleanup and allocation failure followed by fresh-instance recovery.
Removing static-cell collection makes the lifetime and failed-definition output
checks fail. `node tests/static-local-oracle.mjs` reruns the original QEMU proof;
`--record` updates source, runner, capture and output hashes.

## Boundaries

V5.03 allocates these cells in the defining task's code heap, rounded to eight
bytes (`Compiler/PrsVar.HC`, `Kernel/Mem/MAllocFree.HC`). This compiler reserves
module-owned linear storage. It does not implement native code-heap membership,
`MSize`/`Free` on a static address, individual function deletion or compiler
symbol/debugger graphs. No physical address or allocation-order equivalence is
claimed. Pointers allocated by an initializer still have the ordinary allocating
task's heap lifetime; keeping the static pointer does not extend its target's
lifetime after that task exits.

Native accepts reads and addresses of automatic locals in static initializers.
The original parser compiles and calls those initializer expressions while
parsing the definition, before any invocation of the function being defined.
The saved `AutoValue` and `AutoAddress` witnesses certify acceptance only; they
do not certify a stable value from that compiler-time frame. This backend
explicitly rejects those operations instead of evaluating the function's later
caller frame. `sizeof` remains supported because it needs only the local type.

Uninitialized native bytes, unsized-array inference, runtime expression array
dimensions, native incremental recompilation and residual-register return ABI
are separate boundaries. Repeating an exported call is supported; rerunning a
module entry is not a request to recompile all its definitions. Automatic-local
brace initialization is also distinct from the static aggregate initialization
covered here.
