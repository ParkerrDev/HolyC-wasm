// goto.js: functions that use goto. V5.03 lets a goto jump to any label in
// its function, into a loop or out of one. Each statement that holds a label
// is cut into basic blocks, and a dispatch loop runs them:
//
//   loop  block(N-1) ... block(0)  br_table[state]  end code(0)
//         end code(1) ... end code(N-1)  end
//
// A jump forward branches to the end of the block before its target; a jump
// back sets the state and branches to the loop. Statements without a label
// stay structured inside a basic block. A try keeps its try: its body and its
// handler get dispatch loops of their own, which a goto may leave but not
// enter. Functions without goto never come here.
import { VT, EMPTY_BLOCK } from "./wasm/emitter.js";

function stmtKids(s) {
  switch (s.kind) {
    case "Block": return s.stmts;
    case "If": return s.else ? [s.then, s.else] : [s.then];
    case "While": case "DoWhile": case "For": case "Catch": return [s.body];
    case "Switch": return s.items.filter((it) => it.type === "stmt").map((it) => it.stmt);
    case "TryCatch": return s.handler ? [s.body, s.handler] : [s.body];
  }
  return [];
}

export function usesGoto(s) {
  return s.kind === "Goto" || stmtKids(s).some(usesGoto);
}

export class Gotos {
  constructor(ctx, body, global) {
    this.ctx = ctx;
    this.labels = new Map();        // name -> {tries, block, used}
    this.held = new Map();          // statement -> holds a label
    const gotos = [];
    const walk = (s, tries) => {
      if (s.kind === "Label") {
        if (global) ctx.err(s, "No global labels");
        if (this.labels.has(s.name)) ctx.err(s, `Duplicate goto label '${s.name}'`);
        this.labels.set(s.name, { tries, block: null, used: false });
      } else if (s.kind === "Goto") gotos.push({ s, tries });
      if (s.kind === "TryCatch") for (const k of stmtKids(s)) walk(k, [...tries, k]);
      else for (const k of stmtKids(s)) walk(k, tries);
    };
    walk(body, []);
    for (const { s, tries } of gotos) {
      const L = this.labels.get(s.label);
      if (!L) ctx.err(s, `Undefined goto label '${s.label}'`);
      if (L.tries.some((t, i) => tries[i] !== t)) ctx.err(s, `goto into a try: '${s.label}'`);
      L.used = true;
    }
    for (const [name, L] of this.labels) if (!L.used) ctx.cg.warn(`Unused label '${name}'`);
  }

  holds(s) {
    let h = this.held.get(s);
    if (h === undefined) {
      h = s.kind === "Label" || stmtKids(s).some((k) => this.holds(k));
      this.held.set(s, h);
    }
    return h;
  }
  // The statements genStmt hands over. A try stays a try and lowers its body
  // and handler on their own.
  lowers(s) { return s.kind !== "TryCatch" && this.holds(s); }

  region(s) {
    const R = { blocks: [], bb: null, cur: -1, marks: [], loop: null, state: this.ctx.newWLocal(VT.i32) };
    this.place(R, this.block());
    this.lower(s, R);
    this.place(R, this.block());
    this.emit(R);
  }

  block() { return { region: null, id: -1, items: [], term: null }; }
  jmp(R, b) { if (!R.bb.term) R.bb.term = { kind: "jmp", to: b }; }
  place(R, b) {
    if (R.bb) this.jmp(R, b);
    b.region = R; b.id = R.blocks.length; R.blocks.push(b); R.bb = b;
  }
  // The block that takes the next statement: after a goto, a new one that
  // only a jump can reach.
  open(R) { if (R.bb.term) this.place(R, this.block()); return R.bb; }
  item(R, s) { this.open(R).items.push({ s, loops: this.ctx.loops.slice() }); }
  loopBody(R, body, brk, cont) {
    this.ctx.loops.push({ cfg: true, brk, cont });
    this.lower(body, R);
    this.ctx.loops.pop();
  }

  lower(s, R) {
    if (!this.lowers(s)) { this.item(R, s); return; }
    const c = this.ctx;
    switch (s.kind) {
      case "Label": { const b = this.block(); this.place(R, b); this.labels.get(s.name).block = b; return; }
      case "Block": for (const st of c.flattenTry(s.stmts)) this.lower(st, R); return;
      case "Catch": this.lower(s.body, R); return;
      case "If": {
        const t = this.block(), e = s.else ? this.block() : null, j = this.block();
        this.open(R).term = { kind: "cond", cond: s.cond, t, f: e || j };
        this.place(R, t); this.lower(s.then, R);
        if (e) { this.jmp(R, j); this.place(R, e); this.lower(s.else, R); }
        this.place(R, j);
        return;
      }
      case "While": {
        const h = this.block(), b = this.block(), x = this.block();
        this.place(R, h);
        h.term = { kind: "cond", cond: s.cond, t: b, f: x };
        this.place(R, b); this.loopBody(R, s.body, x, h);
        this.jmp(R, h); this.place(R, x);
        return;
      }
      case "DoWhile": {
        const b = this.block(), w = this.block(), x = this.block();
        this.place(R, b); this.loopBody(R, s.body, x, w);
        this.place(R, w);
        w.term = { kind: "cond", cond: s.cond, t: b, f: x };
        this.place(R, x);
        return;
      }
      case "For": {
        const h = this.block(), b = this.block(), st = this.block(), x = this.block();
        if (s.init) this.item(R, s.init);
        this.place(R, h);
        if (s.cond) h.term = { kind: "cond", cond: s.cond, t: b, f: x };
        this.place(R, b); this.loopBody(R, s.body, x, st);
        this.place(R, st);
        if (s.step) this.item(R, { kind: "ExprStmt", expr: s.step, line: s.line });
        this.jmp(R, h); this.place(R, x);
        return;
      }
      case "Switch": {
        const { labels, segs, pre } = c.switchPlan(s);
        const x = this.block(), blocks = segs.map(() => this.block());
        const def = labels.find((l) => l.isDefault);
        this.open(R).term = labels.length
          ? { kind: "switch", s, labels, blocks, dflt: def ? blocks[def.segIdx] : x }
          : { kind: "jmp", to: x };
        c.loops.push({ cfg: true, brk: x, cont: x });
        if (pre.length) { this.place(R, this.block()); for (const st of pre) this.lower(st, R); }
        segs.forEach((seg, i) => { this.place(R, blocks[i]); for (const st of seg) this.lower(st, R); });
        c.loops.pop();
        this.place(R, x);
        return;
      }
    }
    c.err(s, "goto: cannot lower " + s.kind);
  }

  emit(R) {
    const c = this.ctx, f = c.f, N = R.blocks.length;
    const saved = c.loops;
    f.i32_const(0).local_set(R.state);
    R.loop = c.pushCtrl(); f.loop();
    for (let k = N - 1; k >= 0; k--) { R.marks[k] = c.pushCtrl(); f.block(); }
    f.local_get(R.state).br_table([...Array(N).keys()], N - 1);
    for (const b of R.blocks) {
      f.end(); c.popCtrl();
      R.cur = b.id;
      for (const it of b.items) { c.loops = it.loops; c.genStmt(it.s); }
      c.loops = saved;
      this.emitTerm(b);
    }
    f.end(); c.popCtrl();
  }

  emitTerm(b) {
    const c = this.ctx, f = c.f, t = b.term;
    if (!t) return;
    if (t.kind === "jmp") this.jump(t.to, true);
    else if (t.kind === "switch") {
      const disc = c.switchDisc(t.s);
      c.switchDispatch(disc, t.labels, (i) => this.mark(t.blocks[i]), this.mark(t.dflt));
    } else if (t.t.id === b.id + 1 && t.f.id > b.id) {
      c.genCond(t.cond); f.op("i32_eqz").br_if(c.rel(this.mark(t.f)));
    } else {
      c.genCond(t.cond); this.branchIf(t.t); this.jump(t.f, true);
    }
  }

  mark(b) { return b.region.marks[b.id]; }
  // Jump to block b, from the code of a block in b's region or in a region
  // inside it. At the end of the block before b (tail), falling through is
  // the jump.
  jump(b, tail = false) {
    const c = this.ctx, R = b.region;
    if (b.id > R.cur) { if (!tail || b.id !== R.cur + 1) c.f.br(c.rel(this.mark(b))); return; }
    c.f.i32_const(b.id).local_set(R.state);
    c.f.br(c.rel(R.loop));
  }
  // Jump to block b if the i32 on the stack is not zero.
  branchIf(b) {
    const c = this.ctx;
    if (b.id > b.region.cur) { c.f.br_if(c.rel(this.mark(b))); return; }
    c.pushCtrl(); c.f.if_(EMPTY_BLOCK);
    this.jump(b);
    c.f.end(); c.popCtrl();
  }
  goto(s) { this.jump(this.labels.get(s.label).block); }
}
