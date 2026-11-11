# Native edge-case probes

These have native evidence but are not conformance fixtures yet.

`PointerStore.HC` records V5.03 optimizer effects in expressions that both read
and modify the same location. Direct `*ptr++=value` is covered by the passing
`AssignOrder` fixture. Parenthesized `(ptr++)[0]` and self-assignment of a postfix
increment still differ from the current WASM lowering. Their observed outputs
are retained here rather than silently treating these forms as established
language equivalence. Run the source through `tests/oracle.mjs --check` to repeat
the native observation; compile/execute it to inspect the current differences.
