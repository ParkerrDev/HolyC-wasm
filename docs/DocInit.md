# Native document initialization dependencies

This maps implemented foundations and the remaining dependency chain. The
reference is original TempleOS V5.03. A53 implements entry/bin ownership and
insertion; A54 adds program-owned runtime defines; A56 adds compiler-control
and finite byte-buffer ownership. DocInit/New/Rst/Recalc/Clear and full DolDoc
output remain unavailable in the explicit KeyDev profile.

## Define and kernel bootstrap

`Kernel/KDefine.HC` supplies DefineLoad/LstLoad and lookup operations.
`Kernel/KHashB.HC` supplies HashDefineLstAdd. Runtime defines currently live in
program-owned task tables. These tables contain neither the compiler's live
symbols nor the kernel's boot-populated string lists. Runtime DefineLoad cannot
alter already-compiled WASM or define an identifier for later compilation within
the same submitted source. Native return-address/debugger links are unavailable:
host loaders set `src_link=NULL`, not a fabricated `AD:` address.

`SysDefinesLoad` in KDefine loads the original kernel string lists, including
ST_COLORS. Actual DocInit requires that bootstrap context. It must eventually be
provided as measured native data plus its real initialization/lifetime, rather
than an unexplained special case inside HashDefineLstAdd. Do not treat a table
of precomputed DolDoc flags as execution of DocInit.

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
Lex and CInit remain absent. Zero fields are not initialized compiler graphs.

A60 adds the exact finite-stream `LexInStr` algorithm with source-bound native
chunk/state tests. It preserves `done`, partial-buffer nontermination, embedded
zero bytes, unknown-escape put-back, two-digit hex and dollar/nested-stream state,
and allocates nothing. A62 adds native QueVectU8 storage and LexFirstRem with actual queue ownership,
marker put-back and source-state behavior. Its temporary nodes are freed on
HolyC exceptions; reads already consumed are not rolled back. Native valid-case
proofs and actual host/child allocation failures verify this bounded layer. A61 separately corrects source JS lexing to preserve unknown backslashes and
use native zero/hex escapes without C octal decoding. This does not replace the
runtime Lex dependency.

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
