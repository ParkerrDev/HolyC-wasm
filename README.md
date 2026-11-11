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
npm run test:exception    # Cross-call unwinding and repeated stack cleanup.
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

Fresh WebAssembly memory and register locals start at zero. Native HolyC
storage can contain old data: initialize pointers and counters explicitly.
Tests of source that relies on zero-initialized globals are not proof that it
will run on TempleOS. Some self-modifying expressions also have native optimizer
effects not fully reproduced; retained examples and native outputs are in
`tests/probes/`.

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

HolyC exceptions propagate through direct calls and callbacks using typed
[WebAssembly exception handling](https://github.com/WebAssembly/exception-handling/blob/main/proposals/exception-handling/legacy/Exceptions.md).
Catches restore the HolyC shadow stack. A catch that falls through handles the
exception only when `Fs->catch_except` is true; otherwise it propagates outward.
`Fs->except_ch` holds the code. An uncaught exception reaches the host as a
`WebAssembly.Exception` with the exported `__exception_tag` and I64 code.
Native AdamLog and machine return-address logging are not reproduced. Ordinary
WASM traps and unrelated JavaScript exceptions are not HolyC exceptions.

`Free` returns allocations to a coalescing heap; `CAlloc` clears reused storage.
The allocator keeps its headers, free list and shared-memory lock in linear
memory, so a complete RAM snapshot restores allocation state. `MAlloc` throws
`'OutMem'` on failure. `MemSet` and `MemCpy` return the pointer after the written
range, as native V5.03 does; overlapping `MemCpy` copies forward byte by byte.
Nonoverlapping copies and fills use WASM bulk-memory instructions.

Full snapshots that embed compiled WASM must also record `host.state.heapAbi`.
The current `HOST_HEAP_ABI` is 1. Restore that mode with
`createHost({heapAbi:1})`, restore linear memory, then assign the saved
`host.state.heapPtr`; the setter checks the cursor against the RAM metadata.
Pre-ABI-1 snapshots need `createHost({heapAbi:0})`, which retains their original
bump allocator and no-op `Free`. An omitted option selects the current ABI;
snapshot loaders must choose the old mode explicitly when metadata is absent.
Do not switch an existing heap between modes. Heap addresses, native internal
header layout and separate task-owned heaps are not reproduced.

`npm run test:heap` checks allocation lifetime, splitting/coalescing, cleared
reuse, failed growth, full-memory restoration, legacy restoration and four
workers allocating/freeing the same growing shared memory.

## Device contexts and drawing

The runtime now uses the 408-byte V5.03 `CDC` layout and native HolyC algorithms
for bitmap allocation, aliases, pen reset, matrices, depth buffers, pixel reads
and writes, rectangle fills, bitmap blits, lines, circle outlines and glyphs.
Aliases own their context/matrix and share their source bitmap. The QEMU-backed
`Graphics` fixture checks colors, raster operations, both dithers, clipping,
fonts, extent tracking and depth behavior against the original OS. `MemCmp`
compares unsigned bytes and returns -1, 0 or 1, including equal empty ranges.

`GrBorder` takes two endpoint coordinates, not a width and height. `GrCircle`
draws an outline. `DCFill` defaults to `TRANSPARENT`. These native semantics can
expose assumptions in programs written for the previous browser approximations.
The runtime is still a single-window host: task-owned heaps, window occlusion,
transformed/thick borders, 3D lines/curves, sprites and variadic `GrPrint` remain
unsupported. The old empty `GrFloodFill` implementation was removed, so strict
compilation rejects that missing API instead of reporting success for a no-op.

Update compiler and host together for the new `__gr_update` bitmap import.
The graphics adapter should expose its byte index buffer as `gfx.indices` for
efficient, exact row updates, including transparent bytes. `Refresh` also
publishes direct screen-bitmap writes. Older compiled modules can still use the
retained legacy host drawing imports. The allocator ABI remains 1.

`npm run test:graphics` checks 1,000 context lifetimes, offscreen isolation and
bitmap/display agreement. With a TempleOS-Web checkout and its Playwright
dependency installed, `TEMPLEOS_WEB=/path/to/TempleOS-Web npm run
test:browser-games` launches HolyCraft, Babel, Volley and Snake in Chromium with
this checkout's compiler/runtime, checks advancing rendered frames, and saves
screenshots in `tests/.oracle/browser-games/`. Keyboard events are sent, but a
changing animation does not prove they were accepted. This checks rendering
and liveness; behavioral input and complete gameplay need separate tests.


Runtime linkage checks every function body before removing unreachable code.
Strict errors in an unused function still reject the program. Main, explicit
`exports`, user global initializers, and referenced callbacks are roots;
ordinary calls, global references, and runtime initialization hooks supply the
dependencies. The prelude owns its hook metadata: task initialization always
runs; graphics initialization runs when reachable code needs its globals.
Unused imports and literal/constant data segments are omitted as well.

`npm run test:link` covers omission of an unavailable host import, retained
callback imports, strict errors in unused bodies, user initializer side effects
and ordering, repeated initialization, graphics dependencies, and function index
relocation across LEB128 widths. Named WASM exports remain stable, but numeric
WASM function indices are private. HolyC callback values remain table slots.
Static address reservations are currently retained even for omitted prelude
globals and literals; this change reduces module bytes and initialization work,
not the fixed memory/stack/heap layout or compiler parsing/type-checking work.

Native layout queries accept class or variable names: `sizeof(CDC.palette)`,
`offset(CDC.body)`, and the equivalent bare offset `CDC.body`. Nested members,
array widths and pointer type widths are constants, including in array
bounds and constant initializers. They do not evaluate an object. As in V5.03,
`offset(ptr.member)` and C-style `sizeof(value+1)` are invalid. Local variables
and parameters can shadow the `offset` and `sizeof` keywords. Native machine
code size queries for functions are not implemented.

`gr-math.js` holds the original V5.03 graphics math, including fixed-point
matrices, 2D/3D symmetry, reflection, ellipse/polygon tracing and quadratic/cubic
Bézier and B-spline callbacks. `GraphicsMath.HC` compares matrix values, point
sequences, callback cancellation and degenerate symmetry behavior with the
original compiler in QEMU. This supplies shared math for the remaining native
3D raster and sprite work; it does not make those missing APIs available yet.

The native numeric lexer permits an empty exponent (`1e` or `1e-` means 1.0)
and consumes only a minus sign there. Consequently `1e+2` is the expression
1.0 + 2, while `1e2` is 100.0. `FloatBoundary` records these token boundaries
against V5.03 alongside the existing 623 floating-literal bit comparisons.

`gr-primitives.js` uses the original `GrBlot3` bitmap transform and depth-buffer
algorithm, plus native 2D ellipse/polygon/Bézier/B-spline wrappers and
`GrPutChar3`. Bitmap brushes now work with a depth buffer. `Bitmap3.HC` compares
128 combinations of transform, symmetry, mirror selection, depth, draw
suppression and four raster operations against V5.03 in QEMU. It checks exact
bitmap/depth hashes, extents, collision counts and restored context state.
These additions do not implement the remaining 3D line/polygon/sprite APIs.

Integer token boundaries also follow V5.03: any initial decimal digit can
precede `x`/`b`, and that digit starts the accumulator (`1xA` is 26, `2b101`
is 21). Empty suffixes are allowed; integer accumulation wraps to 64 bits.
Underscores begin separate identifiers, not digit separators. The eight native
fixtures for these boundaries also cover `reg`/`noreg` as global, static-local
and member names, while keeping their automatic-local qualifier behavior.
Argument defaults capture their values once at their declaration, as V5.03
compilation does. Nonconstant defaults, including function calls and callback
types, use private cells in WASM memory; calls read the captured value. The
native `DefaultOrder` fixture checks effects, floating conversion, member/local
callbacks, later global initializers and declaration-scope name resolution.

`__rt_init` initializes the declaration-only prefix once, making exported
libraries ready without calling `__main`. The latter executes top-level
statements and intervening declaration initializers in source order. Hosts
must call `__main` for a source file with executable top-level code. Repeated
initialization does not repeat captured defaults. This preserves observable
execution order; the JavaScript compiler does not execute arbitrary HolyC code
during compilation, so dynamic source generation and runtime-defined array
bounds still need further work.
