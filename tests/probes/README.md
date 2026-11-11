# Native edge-case probes

These have native evidence but are not conformance fixtures yet.

`PointerStore.HC` records V5.03 optimizer effects in expressions that both read
and modify the same location. Direct `*ptr++=value` is covered by the passing
`AssignOrder` fixture. Parenthesized `(ptr++)[0]` and self-assignment of a postfix
increment still differ from the current WASM lowering. Their observed outputs
are retained here rather than silently treating these forms as established
language equivalence. Run the source through `tests/oracle.mjs --check` to repeat
the native observation; compile/execute it to inspect the current differences.

`DefaultGlobal.HC` records another remaining difference: native V5.03 evaluates
an argument default while compiling the declaration and stores that value.
Changing its source global afterward does not change the default. The current
WASM call lowering evaluates a nonconstant default at call time. This needs a
source-ordered declaration/evaluation model; do not use mutable default globals
for cross-target behavior. An ordinary wrapper that reads the global and calls
an explicit-argument function preserves call-time behavior on both targets.
