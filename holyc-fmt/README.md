# holyc-fmt — a code formatter for HolyC, written in HolyC

`holyc-fmt` reformats [HolyC](https://templeos.org) source to the canonical
[TempleOS](https://templeos.org) style. The formatter itself is written in HolyC
(`HolyCFmt.HC`) — it is written in the very style it enforces.

## Is there already a formatter in TempleOS?

No. The TempleOS source tree (519 `.HC` files) has **no standalone code formatter**.
The `Compiler/` directory has a lexer, parser, optimizer and assembler but nothing
that re-emits source. The only formatting machinery is:

- the **DolDoc editor** keeps source indented as you type (`Adam/DolDoc/DocChar.HC`
  auto-indents on Enter; indentation is stored *structurally* as `DOCT_INDENT`
  document entries, not as text), and
- there is no "reformat this file" command — TempleOS source is edited, not piped
  through a formatter.

So `holyc-fmt` fills a real gap: it normalizes the *text* form of `.HC` files
(which, once exported out of DolDoc, have inconsistent indentation — see below).

## The style (measured, not guessed)

Conventions were measured across all 519 `.HC` files in `reference/TempleOS`:

| rule | data | holyc-fmt |
| --- | --- | --- |
| no space after `,` | 98% | enforced (in code) |
| no spaces around `=` / operators | 100% | **preserved** (not reflowed) |
| space after `if`/`while`/`for`/`switch` | 100% | `if(`→`if (` |
| function / bare-block `{` on its own line | 100% | preserved |
| control-flow `{` on the same line | 100% | `)`/`else`/`do` → ` {` |
| indent unit | 2 spaces (the `Doc/GuideLines.DD` canonical example & most code) | 2 spaces (or `--tabs`) |
| `case`/`default` | one level inside `switch` | enforced |
| goto-labels (`start_over:`) | column 0 | enforced |
| braceless bodies (`if (x)` ⏎ `foo;`) | indented one level | enforced |

The exported source is genuinely *inconsistent* — the same file mixes tabs and
spaces (e.g. `Demo/Games/RainDrops.HC` has a `switch` indented with 6 spaces and its
`case` with a tab). Normalizing that is the main job.

## What it does

A single lexical pass that, with full awareness of strings, char-consts, `//` and
`/* */` comments (so braces/quotes/`$DolDoc$` inside them are ignored):

- **re-indents** every line from brace depth, plus `switch`/`case` handling,
  braceless-body "hanging" indents, paren/bracket continuation, goto-labels and
  `#preprocessor` lines forced to column 0;
- normalizes **`if (` spacing**, **`) {` / `else {`** block-brace spacing, and
  **`,`** spacing — without touching initializer braces `={1,2,3}`;
- trims trailing whitespace and collapses runs of blank lines;
- **preserves tokens exactly** — strings, comments and DolDoc markup are copied
  byte-for-byte; operator spacing is left as-is (Terry's compact style is already
  canonical, and reflowing operators needs a full parser to stay correct).

## Usage

In **TempleOS / hemu** (the real target):

```holyc
#include "Fmt"
Fmt("::/Demo/Games/Life.HC");           // print the formatted source
Fmt("MyMessy.HC","MyMessy.HC");         // reformat in place (text files only)
```

From the **command line** (runs the *real* HolyC formatter, compiled to WASM by the
`holyc-wasm` compiler in the parent repo — it injects the file straight into WASM
memory, so DolDoc `$$` is never altered):

```sh
node cli.mjs path/to/File.HC          # print formatted
node cli.mjs path/to/File.HC -w       # rewrite in place
node cli.mjs path/to/File.HC --tabs   # indent with tabs
```

## Testing

`holyc-fmt` is verified by *running the actual HolyC* through the `holyc-wasm`
compiler headless and checking two properties on real TempleOS files:

- **idempotent** — `fmt(fmt(x)) == fmt(x)` (a fixed point), and
- **token-preserving** — output equals input once whitespace is ignored (it never
  adds, drops or reorders code).

```sh
node test.mjs            # unit cases + 3 real files
node sweep.mjs 150       # 150 files across Kernel/Compiler/Adam/Demo/Apps
```

Latest: **14/14** unit/real tests and **150/150** files clean (0 idempotency
failures, 0 token changes).

## Limitations

- **Plain-text HolyC only.** DolDoc files with embedded *binary* (sprites — they
  contain NUL bytes) are not text; edit those in TempleOS's `Ed`. The CLI refuses
  files containing NUL.
- **Operator spacing is preserved, not reflowed** (`a+b` and `a + b` are both left
  alone). Distinguishing unary/binary/pointer `*`/`-`/`&` safely needs a full parser.
- Brace *placement* is normalized for spacing but not moved across lines (Terry's
  source is already 100% conformant, so this only matters for hand-broken input).

## Files

- `HolyCFmt.HC` — the formatter core (pure, I/O-free: `HolyCFmtBuf(src)`), in HolyC.
- `Fmt.HC` — TempleOS driver (`FileRead`/`FileWrite`), in HolyC.
- `cli.mjs` — faithful node CLI that runs the HolyC formatter via `holyc-wasm`.
- `runhc.mjs`, `test.mjs`, `sweep.mjs` — the headless test harness.
