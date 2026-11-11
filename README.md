# HolyC-wasm

A HolyC compiler that emits WebAssembly, with a browser graphics, sound and input
runtime. TempleOS-Web uses it for its source editor and native games. HEMU uses
the compiler with its own host imports to build its x86 emulator. HolyC-fmt uses
it to run the formatter written in HolyC.

The compiler is a library. This checkout contains `src/` and `tests/`; the browser
editor and emulator launchers live in TempleOS-Web.

```js
import {compileHolyC} from "./src/compiler.js";
import {createHost} from "./src/runtime/host.js";

const {bytes}=compileHolyC('"Hello\\n";',{lenient:false});
const host=createHost({ansi:false,onText:text=>process.stdout.write(text)});
const {instance}=await WebAssembly.instantiate(bytes,{env:host.env});
host.attach(instance);
instance.exports.__main();
```

Use `lenient:false` for compatibility checks. The older lenient mode substitutes
zeros for some unsupported symbols and calls, so successful compilation in that
mode is not evidence that a program works. Strict `import` prototypes become
WebAssembly imports; `src/abi.js` defines the browser runtime's host interface.

## Checks

```sh
npm test                 # Compare WASM behavior with recorded V5.03 results.
npm run test:intrinsics   # Emitter, atomic memory operations and import linking.
npm run test:oracle       # Boot V5.03 in QEMU and recheck the native results.
```

The fixtures in `tests/v503/` cover postfix casts, goto, operator precedence,
chained comparisons, conditional versus value logical evaluation, comma
statements, case ranges, packed class layout, pointer arithmetic, writable
strings, initialization, unsigned operations and signed floating conversion.
Negative fixtures exercise native compile errors. Each fixture has native
source/output hashes; changing it requires rerunning the oracle. These checks
do not establish full TempleOS compatibility.

## Native oracle

`tests/oracle.mjs` boots the original V5.03 disk under QEMU, injects fixtures into
a private FAT32 disk copy, and runs the real HolyC compiler in a fresh task per
fixture. A guest output hook sends bytes through QEMU's debug port. The compiler
under test is not used to compile those fixtures.

Requires Node, Python 3, `git`, `tar`, `qemu-img` and `qemu-system-x86_64`. KVM is
used when accessible; set `ORACLE_ACCEL=tcg` to run QEMU's CPU emulator instead.
The default 384 MiB guest is single-core. The pinned disk, snapshot, compiler and
emulator revisions/hashes are in `tests/oracle/Manifest.json`. Original assets
are read from sibling checkouts, or from these environment variables:

| Variable | Checkout / required asset |
|---|---|
| `TEMPLEOS_WEB` | TempleOS-Web, including `vendor/images/templeos-hd.qcow2.gz` |
| `HEMU_REPO` | HEMU, including `live.bin.gz` |
| `HOLYC_ORACLE_COMPILER` | HolyC-wasm, with the pinned revision in Git history |

The cache and small run logs/screenshots stay in ignored `tests/.oracle/`.
Private writable disk copies are removed after each QEMU run. Original disk and
snapshot files are never changed.

```sh
node tests/oracle.mjs --check tests/v503/Convert.HC
node tests/oracle.mjs --record tests/v503/Convert.HC
node tests/run.mjs Convert
```

`--engine=hemu` runs the native compiler in the frozen baseline HEMU as a
secondary diagnostic. It is deliberately not accepted as independent evidence
by `npm test`: the baseline emulator's float-to-integer saturation once agreed
with the same incorrect compiler behavior. QEMU/KVM exposed the mismatch.

## Compatibility limits

The browser runtime implements a subset of TempleOS APIs. Many stock programs
still need native graphics, task, file and DolDoc sprite support. The compiler
also has unsupported assembly, indirect calls and other language/runtime gaps.
WebAssembly F64 arithmetic does not reproduce the full x87 extended-precision
environment. Passing a compiler fixture does not prove a game's rendering,
input, performance or behavior on QEMU, other virtual machines or bare metal.

HolyC has different precedence from C: `1<<4+1` is `(1<<4)+1`, bitwise operations
bind above addition, and comparisons can chain through equality. Consumers
ported from C must audit those expressions when moving to this compiler.
