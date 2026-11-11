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
npm run test:document     # Full DolDoc input, sprite integrity and CP437 transport.
npm run test:strict       # Unsupported assembly and unresolved callable symbols.
npm run test:callback     # Imported callbacks and null pointer traps.
npm run test:oracle       # Boot V5.03 in QEMU and recheck the native results.
npm run test:float-scale  # Reproduce the native Pow10I64 table in QEMU.
```

The fixtures in `tests/v503/` cover postfix casts, goto, operator precedence,
chained comparisons, conditional versus value logical evaluation, comma
statements, case ranges, packed class layout, pointer arithmetic, writable
strings, initialization, unsigned operations and signed floating conversion.
They also cover native bit operations, deterministic random sequences, math
rounding, floating remainder and decimal literal conversion.
Typed callbacks cover local/global variables, members, arrays, parameters,
default arguments and native evaluation order. Direct calls and Print evaluate
arguments right to left; an indirect call captures its target first. Nested
printing cannot overwrite the outer call's staged argument values.
Scalar-backed classes such as `U32 class CColorROPU32` retain their integer or
F64 value operations and named fields. Layouts whose byte size differs from
their underlying storage type remain unsupported in strict mode.
Negative fixtures exercise native compile errors. Each fixture has native
source/output hashes; changing it requires rerunning the oracle. These checks
do not establish full TempleOS compatibility.

Pass a complete source file as a `Uint8Array`, `ArrayBuffer` or Latin-1 byte
string. DolDoc `$IB` inserts a private copy of the named binary record and `$IS`
inserts its length. Text-only editor views must append the original binary tail
before compilation. Missing records and truncated payloads are errors. Binary
data extraction is supported; rendering TempleOS sprites remains a runtime gap.
CP437 identifier bytes map to their Unicode names, and Greek Unicode character
literals use CP437 values. Other Unicode characters outside CP437 are rejected.
Cursor and nonbreaking-space document controls and continued source lines are
read without truncating the rest of the program.

`DolDoc.HC` embeds binary record 1 from TempleOS-Web's pinned TinkerOS Rocket.HC;
its native test checks every payload byte, separate literal allocations and
write isolation. It does not claim that the browser can draw the sprite yet.

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
Live QMP sockets use a short system temporary directory so long checkout paths
do not exceed Unix socket path limits.
Private writable disk copies are removed after each QEMU run. Original disk and
snapshot files are never changed.

Other native probes can import `QemuRun` from `tests/oracle/Qemu.mjs` and pass
`QemuRun(sources,{files:[{name,bytes}],timeout:180})`. Sources and extra binary
files are copied into `C:/ORACLE`; file names must be unique uppercase 8.3 names.
The timeout is in seconds. This permits real asset tests without embedding data
in HolyC initializers.

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
also has unsupported assembly, runtime-generated declarations and other gaps.
WebAssembly F64 arithmetic does not reproduce the full x87 extended-precision
environment. Passing a compiler fixture does not prove a game's rendering,
input, performance or behavior on QEMU, other virtual machines or bare metal.

HolyC has different precedence from C: `1<<4+1` is `(1<<4)+1`, bitwise operations
bind above addition, and comparisons can chain through equality. Consumers
ported from C must audit those expressions when moving to this compiler.

Decimal literals also follow V5.03, including its signed 64-bit mantissa
overflow and measured power-of-ten table. For example, native
`9223372036854775808.0` is zero; use `0x43E0000000000000(F64)` for exact 2^63.
The stored table is reproducible by `tests/oracle-scale.mjs`; KVM and TCG give
the same 617 entries. This matches literal compilation, not all x87 arithmetic.

Update the compiler and runtime together: floating `%` uses the `__fmod` host
import. `Seed(nonzero)` and the Rand family reproduce native task-local random
sequences. Timer-mixed randomness uses the host clock, not a physical CPU's TSC.

Function pointers are opaque nonzero indexes into the exported `__functions`
WASM table; zero is null and calling it traps. They are callable references,
not addresses of x86 machine code in linear memory. Native V5.03 rejects an
initializer on a local function-pointer declaration; declare it first, then
assign it. Required argument omissions and surplus arguments fail in strict
mode. Native callback defaults remain available at the pointer's call site.
