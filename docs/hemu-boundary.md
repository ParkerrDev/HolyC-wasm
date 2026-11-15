# HEMU source and its WebAssembly host

HEMU owns the HolyC machine and its native Linux host. HolyC-wasm owns the
WebAssembly compiler, browser host, desktop launcher and integration harness.
This separates browser APIs and Node tooling from the emulated machine; it does
not claim browsers execute WebAssembly without JavaScript.

## Decisions

- Keep browser/compiler integration together in `Apps/HEMU`, with explicit
  access to HEMU source and captured data through `HEMU_ROOT`.
  - HEMU Kernel mixed HolyC CPU/device implementations with browser workers,
    IndexedDB, WebAudio, Node compilation, and browser tests.
  - Compiler/runtime imports and HEMU data URLs assumed one directory layout.
  - Desktop launch and tests relied on working-directory conventions.
- Store compiled JIT as WebAssembly, not generated JavaScript base64.
  - JitCode.js duplicated a compiled binary inside parsed JavaScript and decoded
    it into another allocation at runtime.
- Keep tests with their host and native oracle fixtures. The HolyC core's
  instruction self-tests remain in HEMU.

Migration baseline (tracked files, before changes):

```json
{
  ".js": {
    "files": 26,
    "bytes": 223267
  },
  ".mjs": {
    "files": 114,
    "bytes": 454877
  },
  ".HC": {
    "files": 77,
    "bytes": 388906
  },
  ".HH": {
    "files": 1,
    "bytes": 3680
  }
}
```

The migrated host installs its existing browser-test dependency from
`Apps/HEMU/package-lock.json`. HEMU's shell entry points set `HEMU_ROOT`; tools
may set that variable explicitly when launched from another checkout. Browser
URLs resolve the HEMU data root from the host's mounted location.

The 52,461-byte generated `JitCode.js` is replaced by a 39,291-byte WASM file,
removing the base64 text and runtime decoding allocation. The other host files
are relocated, not claimed as eliminated JavaScript. Node and browser APIs stay
in the compiler project; CPU/device/JIT algorithms stay HolyC in HEMU.

Game evidence now records the actual host modules, compiler runtime, disk module,
compiled engine and fixture bytes. Repository commit pins remain build inputs,
but a documentation-only commit no longer invalidates an execution result.
The startup check compares the recorded engine hash with fresh compiled bytes.

The browser workers install their message handlers before awaiting the JIT
module. A top-level awaited fetch in a static dependency otherwise loses an
`init` posted during that fetch. The desktop check holds JIT delivery until
`init` has been posted, then requires actual guest frames on one and four cores.
Node command entry guards resolve the invoked file's real path, so HEMU's
compiler symlink works as well as a separate checkout.
