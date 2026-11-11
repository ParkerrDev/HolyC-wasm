# Integer types and observable native optimization

A74 corrects the primitive integer result-class and signedness rules measured
against original TempleOS V5.03. For example, an I32 memory field containing -23
divided by a U16 field containing 12 yields -1 and remainder -11. The former
compiler instead used unsigned division and produced 1537228672809129299 and 5.
This is a compiler change, independent of the document helper's earlier explicit
I64 divisor.

`Compiler/OptLib.HC:OptFixupBinaryOp1` selects the greatest raw type in the order
I8, U8, I16, U16, I32, U32, I64, U64. The result remains a 64-bit value; selecting
I8 as its class does not truncate an intermediate addition. That class determines
runtime division, remainder and variable-shift signedness and propagates into
later operators. Unary minus changes an unsigned primitive class to the signed
class of the same width. Compound assignments retain the destination's class.

Native immediate folding uses a different decision: either unsigned operand
selects unsigned calculation, while the resulting class still follows the raw
order. The constant folder therefore retains both width and signedness through
casts, unary operators and nested expressions. This matters for static arrays,
array dimensions and captured default values as well as emitted expression code.

Comparisons also use either unsigned operand, independently of the arithmetic
result rule. In an integer chain, the previous comparison's unsigned class carries
into the next pair. Existing native branch-versus-value evaluation behavior is
preserved; this does not claim new mixed floating/pointer-chain rules.

## Constant rewrites

Original `Compiler/OptPass012.HC` runs three passes. Its rewrites are observable
through the classes and sticky `ICF_USE_UNSIGNED` comparison flag:

- A right-hand constant shift or multiply/divide by a power of two becomes a
  unary shift. On the next pass its class becomes the original left class.
- Right multiply/divide by one removes that operator immediately. Left multiply
  by one and addition/subtraction of zero disappear only in pass 2. A left-hand
  power multiply is converted on the last pass and retains the prior class.
- A comparison remembers unsigned classes observed on earlier passes. Thus
  `signed_value/4(U64)` shifts the signed value, yet comparing that expression
  with zero retains the earlier unsigned comparison flag.
- Fully constant operations retain their selected raw class. Ordinary constant
  division truncates; runtime constant-power division shifts. Existing native
  `%=` power masking, including signed operands, remains intact.

The type walk models these measured scalar rewrites and their pass ordering; it
does not perform arbitrary native algebraic reassociation. Division/remainder by
zero is not folded by this type walk. `IntegerZeroDeferred` proves original V5.03
accepts a function containing such an expression without executing it.

## Evidence

`npm run test:integer-promotion` checks generated HolyC sources against original
QEMU/KVM output with source, capture-wrapper and output hashes. The independent
native recording can be repeated with `node tests/integer-promotion-oracle.mjs`.
The fixtures distinguish packed memory loads from postfix bit casts, runtime
values from constants, direct and nested arithmetic, static initialization,
dimensions/defaults, constant-rewrite asymmetries, and integer chain value/branch
contexts. Normal and NOFOLD address lowering are both checked; NOFOLD is not a
switch disabling every native-style optimization.

Four executable negative controls independently restore unsigned propagation,
discard folded widths, forget earlier comparison flags, and drop carried chain
classes. Each must disagree with the source-bound native output. The original
SmallUnsignedPromotion witness now requires exact equality for both its direct
and explicitly widened expressions. Existing PowerDivide and the full V5.03
fixture suite remain gates for signed shift, masking and constant behavior.

## Remaining boundaries

Native register allocation can keep 64 bits in a narrow local. The separate
`tests/probes/NarrowRegister.HC` witness returns 65559 from a U16 local and
70368744177664 from an I32 product local; the current host returns 23 and 0.
Both return 23 after a U16 memory store. `node tests/integer-register-gap.mjs`
reports this explicitly, and `--record` repeats the original native proof.
These are deliberately narrow locals, despite the normal I64 style rule.
They are not counted among passing arithmetic-promotion decisions. Reproducing
native register allocation/truncation is a separate compiler task.

The matrix covers the eight primitive integer classes. User-derived numeric
classes, complete optimizer reassociation, all mixed floating/pointer chains,
and x86 exception/register ABI equivalence remain outside this checkpoint.
