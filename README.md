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
npm run test:varargs      # Variadic ABI, nested calls and exception cleanup.
npm run test:format       # Native formatting ownership and unavailable OS formats.
npm run test:console      # Shared Print path, terminal presentation and repeated output.
npm run test:composites   # Text/mesh allocation failures, callbacks and recovery.
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
Variadic functions expose native `I64 argc` and `I64 argv[127]`; the declared
array size is descriptive, and calls may pass more than 127 values. Extra
arguments preserve their raw 64-bit representation, including floating values.
Their caller-owned argument blocks are reentrant and released after normal
returns or caught exceptions. A variadic WASM import/export has one hidden
final I64 parameter pointing to the count followed by contiguous I64 arguments.
This calling convention does not reproduce the native x86 machine stack.
Subswitch `start:` prefixes run on case dispatch, while fall-through skips a
case's repeated prefixes. A grouped `break` reaches its `end:`; nested groups
and ordinary loop breaks retain their own targets. Original V5.03 rejects a
break from a try/catch to an enclosing loop, which this compiler now rejects too.
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
data extraction and native Sprite3 rendering are supported.
CP437 identifier bytes map to their Unicode names, and Greek Unicode character
literals use CP437 values. Other Unicode characters outside CP437 are rejected.
Cursor and nonbreaking-space document controls and continued source lines are
read without truncating the rest of the program.

`DolDoc.HC` embeds binary record 1 from TempleOS-Web's pinned TinkerOS Rocket.HC;
its native test checks every payload byte, separate literal allocations and
write isolation. SpriteDocument then compares drawing that same bitmap asset
against original V5.03, including clipping, depth, transforms and symmetry.

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
still need task/window lifecycle, file services and other native APIs. The compiler
also has unsupported assembly, runtime-generated declarations and class-field
`format` metadata. `#ifdef` currently tests macros only, unlike native symbol
lookup; declaring a `kbd` variable does not yet activate `#ifdef kbd` branches.
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
header layout is not reproduced. Ordinary `createHost` has one allocation
owner; the continuation backend below tracks separate task lifetimes.

The task, settings, message, scroll and keyboard records have their complete
V5.03 layouts, including the 1,192-byte `CTask`. `TaskValidate` checks the native
self pointer and signature. The independent `TaskLayout` fixture checks every
field offset and narrow stores; these declarations do not supply scheduling,
message delivery or settings-stack behavior. Ordinary duplicate class members
are rejected even in unused classes. Native `pad`, `reserved` and `_anon_`
members may repeat: lookup selects the first own declaration, before a base
class member, while every declaration still contributes storage.

Circular queue operations and posted message queues now follow V5.03:
`QueInit`, `QueIns`, `QueInsRev`, `QueRem`, `QueCnt`, `QueDel`, `TaskMsg`,
`PostMsg`, `Msg`, `ScanMsg` and `FlushMsgs`. Masks discard unmatched messages;
negative down/up codes enqueue both messages; input-filter and popup routing
use the native task fields. Scan filtering saves the scan value before freeing
its node, correcting the original use-after-free. `Suspend` and `IsSuspended`
read/write the native flag but do not themselves provide a scheduler.
Executable job requests fail explicitly with `JobHost`; dynamic compilation,
input-filter task creation and macro recording are not implemented. The
`Messages` and `Queue` fixtures compare independent native behavior, while
`test:messages` checks failed allocation, poisoned freed nodes and cleanup.

Native window geometry (`WinHorz`, `WinVert`, `WinBorder`, `WinMax`, scrolling
and hit testing), ordering/focus and the text-cell occlusion map follow V5.03.
The initial root describes the existing full-screen borderless canvas, preserving
legacy display bounds. `CDoc`, entry/bin/settings records have their native
layouts; `DocPut`, `DocDisplay`, `DocBorder` and cursor/scroll flags operate on
valid documents. They do not create, clear, parse or render DolDoc documents.

`WinHostDraw(task,layer)` invokes a registered draw callback with a fresh alias,
owned by the target task, and releases the alias even when the callback throws.
This is the measured window-manager callback boundary; an automatic manager,
its persistent surfaces/occlusion allocations and settings lifecycle are still
pending. `WindowGeometry` tests 2,252 state captures plus 34,200 edge points.
`test:window` checks native document layouts/state, 1,280 ordering/focus cases,
6,144,000 occlusion cells and repeated draw/exception ownership. The native draw
probe supplies the isolated alias/callback adapter; it does not claim that the
browser currently executes the full original window manager.

`CFifoU8`/`CFifoI64` and their New/Del/Ins/Rem/Peek/Flush/Cnt functions use
native layouts and mask arithmetic. A power-of-two buffer has `size-1` usable
slots; the runtime does not round or reinterpret the caller's mask. Empty reads
leave their output value unchanged. Constructors release their header if buffer
allocation throws. The operations are uninterrupted in the cooperative
single-core backend; they are not a general cross-worker synchronization API.
`Fifo` compares 45,056 paired operation sequences against V5.03, including wrap,
full/empty and non-power-of-two masks. `FifoFocus` checks native keyboard queue
retention/delivery, and `test:fifo` fails each constructor allocation and verifies
lazy keyboard ownership, reset and cleanup.

Native palette Get/Set functions reproduce six-bit VGA DAC quantization and
wrapped 256-entry addressing; PaletteSetStd restores the standard sixteen.
The host must provide `gfx.palette(index,bgr48)` or instantiation fails before
program initialization. `Framebuffer` accepts an optional shared 256-entry
Uint32 palette; changes recolor existing indexed pixels. Its display maps each
pixel through the low four bits, matching original DCBlotColor4 and stock planar
VGA, while the full DAC table remains readable/writable. Initial DAC entries
16–255 are not claimed to match arbitrary native boot state. `test:palette`
checks native DAC state, all shared entries, original planar conversion, RGBA
presentation and refusal without a device adapter.

The console-only output profile honors native `Silent`/`IsSilent` state for
PutS, formatted strings, PutKey and packed PutChars. Character statements call
PutChars, just as native code does: up to eight bytes are emitted and internal
zero bytes are skipped while higher bytes remain. This adds no keyboard or
continuation requirement. Character statements in no-prelude modules need an
explicit PutChars declaration, like explicit Print for formatted output.
The full native KeyDev/ScrollLock/DolDoc terminal chain remains a separate
runtime profile; console transport does not claim those UI behaviors.

`MAllocIdent(src,mem_task)` copies the source allocation's full usable capacity
into the selected live task; `AMAllocIdent(src)` uses session kernel ownership.
Both return NULL for a NULL source. `MSize2` reports the real internal span:
this allocator uses a 32-byte header, while release V5.03 uses 16 bytes and
has different capacity rounding. These sizes are deliberately not presented
as binary heap-layout parity. Legacy heap ABI 0 cannot recover allocation
sizes and rejects non-NULL MSize/MSize2 queries. Headers and snapshot ABI are
unchanged; only new code using MSize2 requires the paired `__msize2` import.
`test:alloc-ident` compares native copies, verifies native/current span bounds,
and tests child/parent/session lifetime plus allocation failure and retry.

## Cooperative task backend

Reachable `Spawn`, `Kill`, `Exit`, `GetMsg`, `GetKey`, `GetChar`, `PressAKey`
`BreakUnlock`, or access to `kbd` requires
`result.requiredCapabilities` to include `"task-continuations"`. An unreachable
reference adds no requirement. The module also has a capability-only WASM start
function: an ordinary host or a host without JSPI refuses instantiation before
source initializers, allocation or main can run. The site must use this metadata
to decide launch availability before starting a program.

Use `createTaskHost` from `src/runtime/tasks.js` on engines with
`WebAssembly.Suspending` and `WebAssembly.promising` (`taskSupport()` checks
both). Instantiate with its `env`, call `attach(instance)`, then await
`run(entry="__main",...args)`. Named library entries also initialize their
runtime first. `postMessage(code,arg1,arg2,target?)` delivers exact native
messages; the default target is the session root, and scan arguments can be
64-bit BigInts. `stop()` requests task termination; `dispose()` also releases
session-owned storage, including after an error. A caller should handle errors
from both the run and teardown promises. `onTaskError(error,task)` receives
child faults; without that callback they are reported to the output adapter.

`GetChar(I64 *_scan_code=NULL,Bool echo=TRUE,Bool raw_cursor=FALSE)` now has
its real native signature. It ignores zero-character key-downs and non-key
messages, waits cooperatively, and preserves the final complete scan code.
`PressAKey()` displays the native prompt and returns that character. The former
incorrect `(echo,do_scan)` GetChar signature is no longer supported. `GetChar`
and `test:char` compare native waiting, return values and exact echo/prompt
control sequences. Raw cursor editing remains explicitly unsupported.

`Break`, `BreakLock` and `BreakUnlock` preserve native exception, message and
flag behavior. `breakTask(target=0)` requests interruption of the focus task
(or an explicit live task); it returns false for absent/inhibited focus. The
first request clears a break lock and marks a pending break. Unlock delivers
it; an additional request can interrupt immediately. Normal requests wake
sleep/message waits and throw a typed, catchable `Break` inside that task.
Shift-Esc mode emits its native key instead and preserves existing readiness,
as does cross-task delivery by BreakUnlock. Explicit Suspend still wins.
These operations cannot interrupt a non-yielding WASM loop. Hardware disk-lock
release and CPU RIP replacement are outside this cooperative backend.
`test:break` compares original QEMU lock/request behavior, repeated catch and
stack/heap recovery, sleep/suspension, physical Ctrl-Alt-C and uncaught cleanup.

Task audio uses a nonblocking `snd.tone(frequency)` adapter. The scheduler owns
note duration and switches the tone off afterward; it never calls a legacy
blocking `snd.note`. A note-only adapter is rejected explicitly.

Tasks have real suspended continuations, separate guarded shadow stacks, `Fs`
and exception contexts, native parent/child links and message queues. Sleep,
Yield and message waits release the worker event loop. Suspension flags are
honored. Task termination callbacks can wait and yield; native `Kill(task,TRUE)`
can return after a callback starts, before the task dies. Check `TaskValidate`
when actual death is required. Task-owned allocations are released only after
the continuation and descendants terminate. `MAlloc(size,task)` supports other
live tasks; `AMAlloc`/`ACAlloc` and posted messages belong to the session kernel
owner and survive their sending task. Raw `CHeapCtrl` owners are unsupported.
The allocator headers/ABI remain unchanged, but new modules require the paired
host's `__malloc_for` and `__malloc_kernel` imports.

This is a cooperative, single-core, unshared-memory backend, not a model of
native CPU contexts or preemption. A task must reach Sleep, Yield or a message
wait for other tasks and external input to run. Only current-core Spawn with
`JOBf_ADD_TO_QUE` is supported. Fixed child stacks accept 4 KiB through 64 MiB
(default 1 MiB); frame and varargs reservations trap before crossing their
lower bound. A termination callback that never finishes can prevent cooperative
shutdown. Debugger breaks and raw cursor echo fail explicitly. PutKey supports
the host text-output adapter; the DolDoc device pipeline remains separate.

Suspended JSPI continuations cannot be serialized: `snapshot()` explicitly
rejects task sessions. HEMU's guest-machine snapshots remain the portable
TempleOS full-state path, and HEMU builds do not acquire the JSPI requirement.
Hosts without JSPI still need a genuine alternative continuation backend.
Automatic window-manager dispatch and native settings/document allocation
remain subsequent work. Legacy `ScanChar` and `KeyGet` adapters are retained
for unmigrated browser consumers and explicitly rejected by the task host; they are not native input
parity. Native ScanChar's wait-for-release behavior is still pending. A caller
can reject those legacy imports at launch before any program side effects.

`Tasks` and `TaskExcept` compare original QEMU behavior. `test:tasks` also checks
ten same-instance runs, refusal before side effects, cross-task ownership,
failed Spawn cleanup, stack bounds, full scan values and nested cancellation.
`test:tasks-browser` runs the native fixtures under actual Chromium JSPI and
real browser key events through the site's shared physical-key mapping.

`keyBytes(bytes)` accepts one complete PC set-1 packet of one to eight bytes.
Native `KbdBuildSC`, `Char2ScanCode` and `ScanCode2Char` update the public `kbd`
record and deliver native key-down/up messages to `sys_focus_task` (initially
Fs). Both held-key bitmaps, merged/unmerged scan identities, modifiers, repeats,
lock keys, PrintScreen and Pause follow V5.03. `resetInput()` releases held
physical keys and clears an incomplete prefix after focus loss or overflow.
The default task host handles Ctrl-Alt-C as a cooperative break request. An
`onControlAlt(sc,index,inIrq)` adapter overrides that route and must handle all
requested system actions explicitly; other unhandled actions throw. The index is 0–25 for
registered letter actions and -1 for Ctrl-Alt-Delete. `onKeyboardLeds(sc)` is an
optional physical-indicator notification. Hardware ports, macro recording,
raw-cursor editing are not implemented by this host bridge. Native scan codes
wait in the bounded `kbd.scan_code_fifo` while no task has focus; `KbdMsgsQue()`
delivers them when focus returns. Its lazy storage belongs to the session, not
the interrupted child, and reset discards pending old scan codes.

For a worker, `src/runtime/protocol.js` appends a bounded native packet ring to
`makeControlSAB()` while preserving every legacy offset. `keyPacketPush(ctrl,
bytes)` publishes the whole packet and returns false on overflow or an
unacknowledged reset. The producer must also clear its local held-key sources
when delivery fails. `keyPacketReset(ctrl)` requests reset on focus loss;
`keyPacketRead(ctrl)` returns `{reset,packets,overflow}`. A reset discards pending
bytes: call `host.resetInput()` before delivering later packets. `KEY_PACKET`
exports the shared offsets including `WAKE`, an atomic notification counter.
The worker must drain input while idle, using a message kick or asynchronous
wait; the host's `onTick` runs at suspension and is not an idle polling loop.

`Keyboard` compares 57,600 native character/decoder cases; the full original
`KbdHndlr`/`KbdMsgsQue` probe also checks 44 physical packets, every held bitmap
word and all queued message values. `test:keyboard` verifies those outputs,
reset, explicit device effects, allocation-failure recovery, bounded transport,
index wrap and 10,000 concurrent whole-packet publications.

The compiler's reserved WASM atomic intrinsics include
`__a_load{8,16,32,64}(address)` and
`__a_store{8,16,32,64}(address,value)`, alongside the existing RMW operations.
Loads return an I64 bit pattern; narrow loads zero-extend. Stores truncate to
their width and return U0. These are native WASM seq-cst atomic instructions,
with no host imports or read-modify-write polling; naturally aligned addresses
are required, and invalid alignment/bounds trap. These names are compiler
extensions, not stock TempleOS APIs. `test:intrinsics` checks all widths and
5,000 publication handshakes between two actual shared-memory WASM workers.

`npm run test:heap` checks allocation lifetime, splitting/coalescing, cleared
reuse, failed growth, full-memory restoration, legacy restoration and four
workers allocating/freeing the same growing shared memory.

## Device contexts and drawing

The runtime now uses the 408-byte V5.03 `CDC` layout and native HolyC algorithms
for bitmap allocation, aliases, pens, matrices, depth buffers, pixel reads
and writes, filled polygons, bitmap blits, thick/transformed lines and curves,
circle outlines, flood fills and glyphs.
Aliases own their context/matrix and borrow the source bitmap and depth buffer.
Replacing an alias depth buffer gives it its own allocation. Alias deletion
keeps borrowed buffers alive; this corrects a native V5.03 double-free hazard. The QEMU-backed
`Graphics` fixture checks colors, raster operations, both dithers, clipping,
fonts, extent tracking and depth behavior against the original OS. `MemCmp`
compares unsigned bytes and returns -1, 0 or 1, including equal empty ranges.

`GrBorder` takes two endpoint coordinates, not a width and height. `GrCircle`
draws an outline. `DCFill` defaults to `TRANSPARENT`. These native semantics can
expose assumptions in programs written for the previous browser approximations.
The drawing runtime is still a single-window host; window occlusion and the
native window-manager lifecycle remain unsupported. Native `GrFloodFill` and
`GrFloodFill3` use the original iterative scanline algorithm, including its
28 MiB scratch allocation. The scratch is freed after each fill and reused on
subsequent fills. The `Flood` fixture compares 512 combinations of depth,
clipping, transforms, symmetry, dithering and draw suppression with QEMU.

Update compiler and host together for the new `__gr_update` bitmap import.
The graphics adapter should expose its byte index buffer as `gfx.indices` for
efficient, exact row updates, including transparent bytes. `Refresh` also
publishes direct screen-bitmap writes. Older compiled modules can still use the
retained legacy host drawing imports. The allocator ABI remains 1.

`npm run test:graphics` checks 1,000 context lifetimes, 100 repeated flood fills,
offscreen isolation and immediate bitmap/display agreement. With a TempleOS-Web checkout and its Playwright
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
original compiler in QEMU. The drawing primitives and sprite renderer share
this math.

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

Native `GrHLine`/`GrVLine` now preserve depth interpolation, clipping, dither,
collision counts, extent recording and nearest-point behavior. `GrPlot3B`
provides transformed/symmetric points without pen thickness. `Span.HC` checks
256 span combinations and transformed points against original V5.03 in QEMU;
the host display test verifies immediate bitmap/display agreement for depth
spans. The task adapter includes the native `scroll_z` field for this path.

The original 64 pen sizes (normal, collision, even and odd brushes), circle
limits, thick 3D points/lines, transformed curves and native `GrBorder` are now
available. `Pen.HC` checks every brush bitmap and limit table; `Thick.HC` checks
1,040 native outputs across thickness 0–65, raster operations, depth, transforms,
symmetry, mirror selection, curves and borders. Runtime initializer metadata
tracks referenced global fields, so programs that use only unrelated graphics
fields do not allocate these tables. Taking the address of the whole graphics
object conservatively retains all its field dependencies.

`GrFillTri0`, convex `GrFillPoly3`, `GrRect3` and endpoint-based `GrRectB` use
the original native algorithms. `Polygon.HC` compares 512 clipped/degenerate
triangle cases, 64 transformed polygon/rectangle cases and a reversed rectangle
with V5.03, including depth, raster operations, dithering and window offsets.
The 2D primitive functions now live with the 3D primitives in
`gr-primitives.js`; bitmap and device-context operations stay in `gr-prelude.js`.

## Native formatting

`StrPrintJoin`, `StrPrint`, `MStrPrint`, `CatPrint`, callable `Print`, `GrPrint`
and `GrPrint3` use the original V5.03 numeric, string, character, quoting and
list-format algorithms. They include the native Pow10I64 table. `%n` means
engineering notation. `%c` accepts a packed character word. `MSize` reports
available allocation capacity; heap alignment/capacity need not match x86.

File/document `%F`, date/time `%D`/`%T`, Define-table `%S`/`%Z` and symbol `%p`/`%P`
formats raise `FmtHost`, since their OS services are unavailable. They do not
produce placeholders. Temporary formatting buffers are freed on allocation,
format and drawing errors. New compiled formatters need the `__msize` host
import; old embedded snapshots keep working with heap ABI 0 or 1 as before.
String-literal Print shortcuts and callable Print share this implementation,
including argument bit patterns and calls with more than 64 extra arguments.
The new `__puts` host import presents already-formatted DolDoc text through the
terminal adapter; it preserves the existing color option without interpreting
format specifiers again. This adapter is not a full DolDoc document renderer.
The old `__printf` import remains for embedded snapshots, but new modules never
use it. Without the prelude, printing requires an explicit Print declaration.

`Format` compares 220 output records with original QEMU, using identical F64
input bits, including 64 random large values. `Text` compares 64 formatted
bitmap/extent records. `test:format` fails each of 20 internal allocations and
checks recovery, zero leaks and explicit OS-format errors.
`tests/probes/FloatIntermediate.HC` retains a known separate arithmetic gap:
V5.03 keeps some x87 intermediates wider than F64; general F64 expression
evaluation still narrows intermediate results in WASM. Five of its 64 `(Rand-0.5)*1e12` results differ by one ULP before
formatting. The runtime does not claim full extended-precision parity.

Anonymous unions inside classes preserve native packed offsets and expose their
members through the enclosing class. A nested anonymous union begins at the
enclosing union's current maximum size; subsequent ordinary members still
overlay its original base. This is measured V5.03 behavior, not C union layout.
`AnonymousUnion` verifies nested groups, inheritance, scalar overlays and writes.
`SpriteLayout` checks the native sprite and mesh records, including CSprite's
45-byte size and embedded payload offsets. The sprite renderer reads these
native packed records directly.

`GrArrow3`, `GrTextBox3`, `GrTextDiamond3` and `Gr3Mesh` use the native drawing
algorithms, including transforms, symmetry, depth and lighting callbacks.
`Composites` compares 384 drawing cases with original QEMU. Temporary strings,
vertices and reflected meshes are released after allocation or callback errors;
the failure gate verifies six allocation sites and state restoration on retry.
`StrUtil`, `Spaces2Tabs` and `BFieldExtU32` supply the renderer's remaining string
and bit-field operations. `StringUtil` checks all 2,048 flag combinations,
128 in-place/out-of-place tab conversions and 4,224 unaligned bit-field reads.
`StrOcc`, `StrFirstOcc`/`StrLastOcc`, `StrFirstRem`/`StrLastRem`, `Tabs2Spaces`,
`ScaleIndent` and `MStrUtil` supply the shared path/text transformations.
Markers are sets of bytes, removal consumes the native first/last segment,
and tab expansion counts columns through newlines as V5.03 does. `PathString`
compares 48 separator combinations, 12,288 flag/scaling transformations, 257
long tab/newline strings and 390 indentation cases against original QEMU.
`test:path-string` fails every temporary allocation and verifies cleanup,
unchanged source bytes and successful retry. These are string operations;
filesystem existence and directory context remain separate requirements.
The bit-field API, like its native assembly counterpart, reads an unaligned U64;
callers must provide that accessible storage even for smaller requested fields.

`MyCore` is a host-runtime extension returning the WASM instance's configured
core index. Bare and explicit calls agree, and a source-defined function of that
name takes normal precedence. It is not a stock TempleOS symbol: native code
uses `Gs->num` or an explicit host adapter. `CoreOverride` checks native user
function semantics; `test:core` checks four configured host core IDs. The
unresolved native probe remains in `tests/probes/HostCoreBare.HC` as evidence of
that API boundary.

Sprite3 supports all 29 drawing/control element types, single-element mode,
transformed wrappers, extents, Sprite2DC and DC2Sprite. Sprite compares 1,920
native drawing cases plus element sizes, type masks, bitmap conversion and
context state. SpriteDocument exercises the embedded Rocket bitmap asset in
32 more cases. These APIs expect valid native sprite streams and caller-owned
storage; they are not bounded decoders for untrusted uploads. Unknown element
types throw Graphics instead of allowing a non-advancing walk.

`test:sprite` fails 52 allocation positions and exercises nested transform and
lighting exceptions, spline cancellation/throws, aliases and retries. Context
creation and transformed curves release their allocations on errors; sprite
wrappers restore the caller's drawing state after a failed draw. These cleanup
corrections improve failure behavior relative to the original native routines.

Direct conversion of an F64-by-F64 product to an integer now preserves x87's
64-bit significand rounding before truncation. The helper is pure HolyC over
integer limbs and is linked only when used, including without the prelude.
`FloatProduct` compares 1,380 input pairs through local/global stores, return
values and arguments with QEMU, including invalid values and boundary cases.
It also checks that an explicit intermediate F64 variable still rounds to F64.
This fixes a measured one-pixel planar-symmetry difference; it does not establish
full x87 expression precision, altered control-word behavior, or mixed
integer/F64 extended-precision arithmetic.
