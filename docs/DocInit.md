# Native document initialization dependencies

This maps implemented foundations and the remaining dependency chain against
original TempleOS V5.03. A67 supplies finite byte-token Lex; A68 runs the actual
DocInit metadata algorithm once for the root session and exposes PrsDocFlags.
DocNew/Rst/Recalc/native Clear and full DolDoc output remain unavailable in the
explicit KeyDev profile. Boot-only DocInit is not a callable refresh API.

## Define and kernel bootstrap

`Kernel/KDefine.HC` supplies DefineLoad/LstLoad and lookup operations.
`Kernel/KHashB.HC` supplies HashDefineLstAdd. Runtime defines currently live in
program-owned task tables. These tables do not contain the compiler's live
symbols. The document initializer loads its four measured standard lists;
other kernel bootstrap lists remain absent. Runtime DefineLoad cannot
alter already-compiled WASM or define an identifier for later compilation within
the same submitted source. Native return-address/debugger links are unavailable:
host loaders set `src_link=NULL`, not a fabricated `AD:` address.

`SysDefinesLoad` in KDefine loads the original kernel string lists, including
ST_COLORS. A68 provides that exact list as an explicit initializer dependency,
using DefineLstLoad and normal hash operations. HashDefineLstAdd has no
document-specific shortcut, and default flags are computed by real Lex and
PrsDocFlags rather than substituted constants.

## Compiler control and stream ownership

`Compiler/Lex.HC:CmpCtrlNew` allocates CCmpCtrl, initializes its queues/options and
four hash-table pointers from Fs, chooses the identifier bitmap, pushes CLexFile,
resolves a supplied filename through FileNameAbs (otherwise blkdev.tmp_filename)
and attaches the input buffer. CCF_DONT_FREE_BUF borrows only the outer buffer.
Nested include buffers still belong to their CLexFile nodes. A56 implements
this finite-buffer control path and exact record layouts. Constructor failure
releases partial state without adopting the caller's buffer. Native CCF_PMT
allocates a prompt buffer and requires a real command-line device; A56 rejects
that mode before allocation rather than treating it as a finite stream.

`LexFilePop` distinguishes byte buffers from LFSF_DOC documents; the latter
requires real DocDel. `CmpCtrlDel` also releases parse snapshots, hash contexts,
parser stack, current string/help index and dollar buffer. A56 implements these
byte-buffer lifetimes with 38 host allocation-failure/retry cases; document
streams are rejected before destruction/size/pop mutations. The full native
CCmpCtrl layout includes embedded CAbsCntsI64 and CCodeCtrl, not merely token,
string and input-pointer fields. The source-bound native-only
`tests/probes/LexLayout.HC` records the earlier native-only measurement. A56's
permanent CmpControl fixture checks all record field offsets and both native
and host executions. Original QEMU measured CCmpCtrl=472 bytes, CLexFile=80,
CLexHashTableContext=72 and CCodeCtrl=48. Key CCmpCtrl offsets are htc=144,
hash_entry=216, cur_buf_ptr=256, lex_include_stk=264, opts=320, coc=392 and
ps=440. Opaque pointer types can preserve layout, but an embedded record must
have its measured complete representation.

## Character stream and lexer

`LexGetChar` handles byte buffers, nested streams, put-back state, line numbers,
CH_CURSOR skipping and CH_SHIFT_SPACE conversion. It also dispatches DolDoc text,
tabs, binary insertions and shifted scripts through LexDollar/Doc2PlainText, and
handles interactive prompts. A58 implements the finite NUL-terminated byte-stream
path, LexSkipEol and transactional LexIncludeStr; it rejects prompt/document
modes before mutations. Echo follows the selected console or KeyDev profile.
Native state/echo/counter fixtures and host allocation-failure checks cover this
bounded layer. It does not supply tokens or document/prompt handlers.

The complete native CCmpGlbls/CIntermediateCode layouts are present. A fresh
host session explicitly zeroes cmp storage and implements the shared
`cmp.compiled_lines` counter. Tests compare deltas with the already-running native
compiler. A63 initializes the original three dual-U16 token tables, binary-op
table and two register maps, including counts/masks. Six staged session-owned
allocations publish only after success. Counter-only access remains allocation
free; real aggregate/subobject escapes and aliases conservatively initialize
the tables. Native proof compares all 1,218 values plus alias/task access;
host failure tests cover each allocation and disposal. Native CmpFillTables is
a boot routine whose repeated calls replace pointers without releasing old
arrays, so it is not exposed as a refresh API. ASM/internal-type/IR graphs,
Compiler-controlled Lex and CInit remain absent. Zero fields are not initialized compiler graphs.

A60 adds the exact finite-stream `LexInStr` algorithm with source-bound native
chunk/state tests. It preserves `done`, partial-buffer nontermination, embedded
zero bytes, unknown-escape put-back, two-digit hex and dollar/nested-stream state,
and allocates nothing. A62 adds native QueVectU8 storage and LexFirstRem with actual queue ownership,
marker put-back and source-state behavior. Its temporary nodes are freed on
HolyC exceptions; reads already consumed are not rolled back. Native valid-case
proofs and actual host/child allocation failures verify this bounded layer. A61 separately corrects source JS lexing to preserve unknown backslashes and
use native zero/hex escapes without C octal decoding. This does not replace the
runtime Lex dependency; A67 supplies its finite-byte subset.

`Lex` depends on the character bitmaps, native numeric/escape/string rules,
HashFind and nested define expansion. A64 supplies exact class/member record
layouts and MemberFind, MemberMetaFind, MemberMetaData, MemberClassBaseFind and
MemberLstCmp
over caller-owned graphs, including native inherited lookup and use counts.
These allocation-free queries do not populate native compiler symbols or build
their graphs; MemberAdd and recursive class/function destruction are absent.
The source-bound native proof and child lifetime checks preserve that boundary.
Operators use the native dual-U16 token
lookup tables. Directives reach file includes, source metadata, conditional
expression evaluation, compiler state and execution. Missing compiler symbols
must not be replaced with arbitrary keyword numbers or ignored directives.
A56 implements `LexPush/PopRestore/PopNoRestore` over actual stream records,
including the native U8 saved-character truncation and borrowed pointer fields.
Allocation failure preserves the current state. The native restriction against
crossing include boundaries remains. LexExcept/reporting also needs
an explicit device contract; returning a token after a lexical failure is wrong.

A66 supplies the native LexPutToken output and LexPutLine's finite-byte output
through the selected console or KeyDev chain, with the actual typed
char_bmp_displayable bitmap. Token/line output does not alter the compiler
control or its input record. A document line throws LexMode before output;
DocPutLine remains absent. LexPutLine preserves its live public U0 signature:
the native implementation's residual next-pointer return register is not a
portable return value and is not emulated. Source-bound native tests record
that distinction separately from legal calls.

LexPutPos still needs FixSet's debugger/session state, PutFileLink's real output
context and AdamErr's task job execution. PrintErr/PrintWarn additionally need
Caller stack metadata and GetOutOfDollar. LexExcept/Warn are not supplied as
reduced throw-only adapters. These reporting/controller dependencies still
block full compiler-controlled Lex and are distinct from its token rules and
directive execution. A67 reports bounded error category/location data through
a required host device, preserving HolyC cleanup if its diagnostic observer
fails. It rejects prompt/document/compiler directive capabilities explicitly.
The mixed I64/F64 precision witness remains a documented numeric-token gap.

## Actual DocInit and flag parsing

`Adam/DolDoc/DocInit.HC` loads ST_DOC_CMDS/ST_DOC_FLAGS/ST_LINK_TYPES, creates the
512-bucket document command/flag/color table and expands those lists. It clears
default arrays, creates a compiler control over the original defaults expression,
sets `cc->htc.hash_table_lst=NULL`, then calls the real Lex and PrsDocFlags. That
NULL disables symbol lookup/define expansion for this parse; it does not make a
hardcoded metadata decoder equivalent to the general native lexer.

`DocPlain.HC:PrsDocFlagSingle` resolves an identifier through `doldoc.hash`, updates
its bit in the entry flags, and mirrors BLINK/INVERT/UNDERLINE/SEL into the type
word. It consumes only a recognized flag. `PrsDocFlags` reads repeated plus/minus
operators and preserves the native remaining token/error behavior. After parsing,
DocInit derives the form/invisibility/data/duplicate-check bitmaps and clean scan
codes. These are computed results requiring native differential fixtures, not
substitute constants for an unimplemented parser.

Real constructors, reset/clear and recalculation then depend on this initialized
state, directories, entry ownership, rendering/layout and synchronization. Keep
that dependency chain explicit until those operations execute and clean up under
both original TempleOS and the supported host backend.


A68 implements that metadata startup and both public flag parsers. Live native,
source-copied native and staged native outputs agree on 1,986 metadata values
and 1,001 parser cases. Child tests preserve root-owned state while shadowing
child defines. The staged constructor publishes a complete CDolDocGlbls only
on success; 321 actual host allocation failures restore prior definitions and
release temporary control/list/hash ownership. Native DHT bits overlap kernel
HTT bits, so document entries have a domain-specific destructor. This is a
root-session bootstrap, not a public repeated DocInit implementation. Return
address/debugger source links remain unavailable, and no live compiler symbol
graph is introduced.

A69 supplies the native DocEntryNewBase constructor and DocFormFwd/DocFormBwd.
The constructor allocates the shortened 88-byte base record for doc->mem_task
and applies the initialized type defaults, preserving native field truncation.
Form navigation changes only cur_entry and cur_col; it uses the actual form
bitmap, LINK/SKIP_IN_FORM flags and sentinel recovery. Native backward navigation
also skips indent entries in the forward direction; the port preserves that
measured behavior. There is no document creation or layout hidden in these APIs.

The remaining concrete chain is DocNew/Rst/Top/Recalc. DocTop invokes the now
available DocFormFwd and actual DocRecalc. DocClear emits a real CL command through DocPrint and recalculates. DocNew also
installs EdLeftClickLink, whose file/compiler/UI behavior needs its own explicit
capability boundary. None of these may be replaced with a silent callback or
no-op layout routine merely to compile native games.

A69 tests compare 13,000 navigation states and 344 complete base-entry byte
layouts with both stock V5.03 and the port compiled by V5.03. A separate native
MHeapCtrl witness verifies NULL/current/foreign task ownership; host tests use
its actual allocation-owner sets, not a fabricated native heap header. Foreign
children release their entries on exit. Five repeated sessions and every base
constructor allocation failure preserve document bytes, task ownership and the
stack, and permit immediate retry. Native allocator-failure injection is not
claimed. The caller must supply valid native queues and an in-range entry type;
these helpers do not validate or repair corrupted documents.

## Layout helpers before DocRecalc

A70 adds DocWordWrapDel/Add, DocSplitTag, DocRecalcXY, DocTmpAttr, DocCharDist,
DocDelToNum/Entry and DocEntryLink in the explicit KeyDev profile. These are the
actual native helper algorithms, not a DocRecalc implementation. They operate on
valid caller-owned queues/entries and preserve native type, flags, cursor,
settings and ownership behavior. DocEntryLink only allocates a copy of the
selected tag/aux string; it performs no link resolution or editor invocation.
The profile retains real DocEntryDel/RawPrint diagnostics. Pure arithmetic
helpers still have no device or allocation dependency when reached alone.

DocSplitTag stages the cloned entry, suffix, replacement prefix and marker
before changing the queue or source string. Native valid-path state remains
identical; allocation failure leaves the input unchanged and frees only the
pending owned allocations. A source-bound negative control runs the original
helper with an actual host allocation failure and observes its unpublished
clone leak. DocWordWrapDel preserves its native incremental contract: a failed
later join retains completed joins or removed soft newlines. Each join allocates
before replacing its tag; the queue remains valid and temporary ownership is
released. This is not whole-operation rollback.

A split strips the clone's allocation flags except its own new tag, retaining
borrowed auxiliary pointers exactly as native. Shared bin use_cnt is not
incremented by DocSplitTag. The proof gives the bin two references deliberately,
checks the unchanged count after splitting, then deletes both references and
checks complete disposal. It does not claim one deletion frees all clones or
that arbitrary invalid text/bin ownership combinations are safe. Shortened
base entries and full entries retain distinct valid field ranges; native
allocator spans still differ from host spans. Valid nonnegative split indexes,
proper owned strings/flags, nonzero page length and native queue invariants
remain caller preconditions.

The source-bound proof compares stock V5.03, copied original helpers and staged
helpers compiled by V5.03: 9,841 coordinate/attribute/distance cases, 126 split
states, 1,120 wrapping states, 1,680 deletion states, 72 link/null/empty cases,
128 borrowed-field/bin cases and native foreign-task heap ownership. Five host
lifetimes, current/foreign ownership, 48 actual allocation failures with retries
and complete disposal cover the host layer. Native allocator-failure injection
is not claimed. No screen rendering, data-refresh callbacks, editor, DocRecalc,
DocTop/Rst/New or native DocClear is made available by these helpers.

### Small-integer promotion evidence

`tests/probes/SmallUnsignedPromotion.HC` reduces the issue found in DocRecalcXY.
For an I32 field -23 divided/reduced by a U16 field 12, original V5.03 returns
-1 and -11. A74 fixes the compiler's raw-type selection, and the test now requires
both the direct and I64-widened forms to match. The earlier layout helper's
explicit divisor remains equivalent; other unsigned header/footer expressions
remain intact, including the adversarial U16 65535 coordinate case.
[IntegerTypes.md](IntegerTypes.md) records the wider matrix and the separate
native register-local width boundary.

## Normal document layout

A71 makes actual normal `DocRecalc` available in the explicit KeyDev profile.
The implementation is the normal/full-refresh path of the V5.03 function, with
real DocWordWrapAdd/Del, DocRecalcXY, DocTmpAttr, deletion, window geometry and
locking. It updates every accepted entry's settings, coordinates, page and
attributes; handles tabs, margins, page breaks, colors, cursor/PMT commands,
wrap flags and CL commands; trims entries and recalculates when required.
The native old_cur_col self-assignment is retained. The reduced pass uses a
checked switch: preserving the original unchecked switch after removing the
high-numbered rendering cases would jump beyond its native table for buttons.

The accepted inputs are valid native queues, correctly sized entries and owned
strings, a valid window task, and flags exactly RECALCt_NORMAL (zero). Data,
checkbox/list/macro/menu/hex/tree/sprite/bin/song/HTML/error entries, dynamic tags
or defines, data refresh, tree/list flags, binary content, borders, scrolling
text and remallocating data are rejected. Source TEXT highlighting remains
unavailable. A private read-only classifier applies the exact native
FILEMASK_SRC masks to the final pathname component; it does not provide a
substitute general FilesFindMatch API or touch a filesystem. Empty source-named
documents retain the native highlight flag. Matching results are covered across
CP437 byte values, case, path separators, compressed extensions and empty names.

Page lengths must be nonzero and larger than header plus footer throughout the
pass. Documents containing active CL commands or a custom max_entries bound
also require the smallest possible page length to exceed the largest header
plus largest footer, and cannot combine TEXT with any active enabling highlight
command or source-name highlighting. Those conservative bounds protect later
recursive passes after prefix deletion: a removed page/highlight command must
not expose an unsupported operation after the first pass has already mutated
the document. A custom max_entries permits at most 1,024 retained HOLD/FILTER_SKIP entries,
conservatively counting each active held TEXT byte as a possible wrapped entry;
negative limits are rejected. These are explicit finite
input bounds, not claims that every native normal-layout document is supported.
Native corrupted-queue/pointer repair is not supplied.

Validation occurs before taking a new document lock and is repeated after
acquisition. An existing foreign lock is waited on with real Yield; inherited
locks remain owned by their caller. Completed native joins, splits or deletions
remain after an allocation failure; pending unpublished allocations are cleaned
up by the existing staged helpers. A new cleanup path releases only locks taken
by this call, including a pending Break raised during unlock, and restores the
prior failure-only marker and exception chain. It does not roll back all prior
layout mutations. The host tests inject actual allocator failure and an actual
task break; original-native OOM injection is not claimed. Geometry is read
without yielding in the cooperative backend; no native CLI/IRQ equivalence or
physical interrupt-state emulation is asserted.

The source-bound three-way native proof covers 256 mixed layouts, 480 accepted
control cases, 64 CL/hold/filter cases, 4,208 empty/name states, eight trimming
states and ten nested/waiting/pending-break lock states: 5,026 canonical states.
A separate original-native MHeapCtrl proof checks every wrap allocation belongs
to the document's foreign mem_task. Host tests cover five lifetimes, 94
pre-mutation rejection cases (including recursive exposure), 136 actual
allocation failures with ownership/retry checks, and five pending Break/OOM
collisions. A separate source-bound staged-native proof exercises the same 94
rejections and verifies unchanged heap spans; it deliberately does not invoke
unsupported modes through stock DocRecalc. Host instrumentation additionally
proves no allocation calls during rejection. Removing cleanup from the same pass makes the allocation gate fail
with its lock held. The normal and unfolded compiler modes are checked.

The page-adjustment divisor's earlier I64 widening remains native-equivalent;
A74 also fixes the direct primitive expression in the shared compiler. The next
dependency after DocTop/Bottom/Rst is the real constructor,
DocPrint/DocPutS command path and editor invocation. None are added as stand-ins;
KeyDev DocClear remains unavailable and the separate console legacy no-op remains
explicitly documented.

## Cursor, reset and deletion lifecycle

A72 adds real DocTop/Bottom/Rst/Del in KeyDev, without new globals or host imports.
Top/Bottom resolve a NULL argument through actual DocPut and validate the A71
normal-layout subset before changing cursor or scroll state. They retain caller
locks; newly acquired locks are released on layout failure. The same partial
layout contract applies: completed joins/deletions remain after OOM, rather than
pretending the whole call is atomic. Invalid signatures retain native behavior:
the cursor operation can run on initialized queues while DocRecalc itself returns
FALSE, as needed during construction and destruction.

Reset validates the empty post-reset layout, not the old contents it destroys.
A valid-signature document needs a real window task and a nonnegative entry limit;
invalid-signature construction/destruction does not execute layout. Old reset
releases entry-owned fields/bins and undo bodies, then restores native defaults
and runs actual DocTop. Fresh reset requires fresh storage and never frees a
previous queue. Owned find/replace and dollar buffers, callback fields, borrowed
user data and other fields not reset by V5.03 remain unchanged. The default text
attribute is native WHITE<<4+BLACK, not an assumed 0x70. DocDel invalidates the
signature before reset, then frees the auxiliary buffers and document itself.
No constructor, editor callback or command-output parser is fabricated here.

Two cleanup changes are intentional improvements over stock behavior. The stock
orphan-bin loop omits Free(b->tag); a source-bound QEMU probe leaves exactly the
owned tag's native MSize2 span (24 bytes in the reduced witness). The port frees
that owned tag, including an orphan left after shared entry references decrement
its count. Native DocDel also leaves the CDoc allocated if pending Break throws
from its final DocUnlock. A cleanup-only catch frees the final object while the
original exception propagates. Native stock/staged ownership probes report both
remaining allocations as 1/0 and verify the exception chain. They deliberately
reclaim original leaked storage after observing it. No claim of identical heap
headers or native allocator-failure injection is made.

Undo entries are detached before their bodies/records are freed, keeping the
queue valid during destruction. Valid native state remains equal. These routines
require valid queue links, correctly sized records and the native ownership
flags; they do not repair corrupted documents or promise recovery after invalid
Free calls. Child/foreign task storage retains its original owner until the real
Free operation removes it. A caller remains responsible for any external stored
pointer to a document after DocDel, as in the original API.

Permanent source/wrapper/capture/output-bound tests compare stock, copied stock
and staged native code over 512 cursor states and 128 reset states, plus actual
foreign MHeapCtrl ownership. The host gates run five lifetimes, 80 reset/delete
ownership cases, 152 real Top/Bottom allocation failures and 168 unchanged-state
rejections. Source-bound native probes independently prove both cleanup changes;
the original implementations fail the host leak gates as well. Normal and
unfolded compilation pass. Existing document/KeyDev gates and 132 compiler
fixtures pass. A71 and A72 produce identical complete HEMU artifacts (including
the stock-capture custom section) from immutable HEMU 253af3d sources, and
identical artifacts for the four current browser games; no redundant engine
execution claim is inferred for a different source version.

The next concrete chain is PrsDollarCmd from DocPlain.HC and real DocPutS/DocPrint
from DocPutS.HC. The generic command parser already has metadata and finite Lex,
but its expression-backed arguments call LexExpressionI64 (native execution/
compiler symbols remain unavailable), and other commands invoke callbacks,
classes, binary content or debugger services. Any first bounded command-output
path must reject unsupported operations explicitly, preserve input delimiters,
and stage unpublished owned entries safely on failure; it cannot special-case
DocClear by silently bypassing dollar-command parsing. DocNew also installs
EdLeftClickLink, which calls real Ed/PopUpEd. Those editor capabilities remain
open and may not be replaced with a no-op link callback.

## String-token extraction for command parsing

A73 supplies the actual Compiler/LexLib.HC LexExtStr algorithm over finite Lex.
PrsDollarCmd uses it for tag/auxiliary/define/macro/link strings. The helper takes
ownership of cur_str, combines adjacent TK_STR bytes including embedded NUL,
leaves the native next-token/include/put-back state, and publishes _size only
on success. lex_next=FALSE preserves the original immediate-backslash rule;
it does not mean an invented whitespace-tolerant continuation policy. Controls
whose first token is not TK_STR preserve the native direct-transfer behavior.

Prompt/document/missing streams reject before a string-token transfer. A cleanup
catch frees detached and pending concatenation buffers on allocation or actual
HolyC callback failure, while consumed source/echo remains consumed. A source-
bound original-native echo witness measures one leaked detached allocation in
stock and zero in the staged helper. Native allocator OOM is not injected; host
failure and callback ownership gates are separate and cover root/child tasks.
The old function is a meaningful negative control for one echo leak and two
lost buffers on a failed join allocation. Existing structured lexical error
categories/host-diagnostic limits remain unchanged.

The three-way native valid proof contains 611 cases, including all 256 escaped
byte values, embedded NUL, empty/long strings, comments, newline flags, NULL size
output, backslash continuation, token transfer and nested defines. Five host
lifetimes, 74 allocation failures and 1,318 throwing echo positions pass, along
with unchanged-control rejection and malformed/unsupported next-token cleanup.
Normal and NOFOLD address lowering agree. No new globals/imports are introduced;
A72/A73 produce byte-identical complete HEMU 253af3d and four current browser-game
artifacts. This supplies string ownership, not LexExpression or document output.

Before a larger command-parser layer, the recorded I32(-23)/U16(12) signed
quotient/remainder mismatch will be reduced across mixed integer types/operators
and corrected in general lowering if bounded. The existing page-modulo widening
is not evidence that the primitive is correct. Then PrsDollarCmd/DocPutS/DocPrint
and real editor invocation resume along the dependency chain above.
