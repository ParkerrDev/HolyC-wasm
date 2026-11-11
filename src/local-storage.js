import {foldConstInt} from "./fold.js";

const REG_NONE=32,REG_ALLOC=33,REG_UNDEF=-128;
const GENERAL_REGS=[6,7,10,11,14,15],NON_POINTER_REGS=[12,13];
const FORCED_SCORE=0x3FFFFFFFFFFFFFFFn;

// Kernel/QSort.HC's middle-pivot partition is deliberately unstable. Replacing
// it with stable Array.sort changes which equal-score narrow locals spill.
function scoreSort(entries,lo=0,count=entries.length) {
  if (count<2) return;
  let left=lo,right=lo+count-1;
  const pivot=entries[lo+Math.floor(count/2)].score;
  do {
    while (entries[left].score>pivot) left++;
    while (entries[right].score<pivot) right--;
    if (left<=right) {
      [entries[left],entries[right]]=[entries[right],entries[left]];
      left++;right--;
    }
  } while (left<=right);
  const a=right+1-lo,b=lo+count-left;
  if (a>1 && a<count) scoreSort(entries,lo,a);
  if (b>1 && b<count) scoreSort(entries,left,b);
}

// OptPass3.HC counts a frame-address LEA and its load/store separately. Only
// the exact starting offset cancels the address balance; an escaped address
// and nonzero array offset cannot become a native register local.
export function nativeRegisters(fn,locals,addrTaken,constant=foldConstInt) {
  const params=new Set(fn.params.filter(p=>p.name).map(p=>p.name));
  const declarations=[...fn.params.map(p=>[p.name??"_anon_",p.name?
    locals.get(p.name):{type:p.type,registerHint:p.registerHint}]),
    ...Array.from(locals).filter(([name])=>!params.has(name))];
  const entries=declarations.map(([name,d])=>({name,d,
    score:d.registerHint==="alloc"?FORCED_SCORE:0n,
    reg:d.registerHint==="none"?REG_NONE:d.registerHint==="alloc"?REG_ALLOC:REG_UNDEF}));
  const map=new Map(entries.map(e=>[e.name,e]));
  let disabled=false;
  const local=n=>n?.kind==="Ident" && n.globalBinding===undefined &&
    n.functionBinding===undefined?map.get(n.name):undefined;
  const reference=(n,score=2n)=>{const e=local(n);if(e)e.score+=score;};
  const root=n=>{while(n?.kind==="Cast" && n.postfix)n=n.operand;return n;};
  const walk=n=>{
    if (!n || typeof n!=="object") return;
    if (n.kind==="Sizeof" || n.kind==="Offset") return;
    if (n.kind==="TryCatch") disabled=true;
    if (n.kind==="Ident") {
      const e=local(n);
      if (e?.d.type.kind==="array") {reference(n,1n);e.escape=true;}
      else reference(n);
      return;
    }
    if (n.kind==="Cast" && n.postfix && local(n.operand)?.d.type.kind==="array") {
      reference(n.operand);return;
    }
    if (n.kind==="Index" && local(n.base)?.d.type.kind==="array") {
      const e=local(n.base),offset=constant(n.index);
      reference(n.base,offset===0n?2n:1n);
      if (offset!==0n) e.escape=true;
      walk(n.index);return;
    }
    if (n.kind==="Unary" && n.op==="*" && local(n.operand)?.d.type.kind==="array") {
      reference(n.operand);return;
    }
    if (n.kind==="Member" && !n.arrow) {
      let base=n.base;
      while (base?.kind==="Member" && !base.arrow) base=base.base;
      const e=local(base);
      if (e) e.reg=REG_NONE; // PrsUnaryModifier disables registers for dot access.
    }
    if (n.kind==="Unary" && n.op==="&") {
      const x=root(n.operand);
      if (x?.kind==="Ident") reference(x,1n);
      else walk(n.operand);
      return;
    }
    if (n.kind==="DeclStmt") {
      for (const d of n.decls) if (d.init) {
        const e=map.get(d.name);
        if (e) e.score+=2n;
        walk(d.init);
      }
      return;
    }
    for (const [key,value] of Object.entries(n)) {
      if (["type","retType","globalType","default"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value==="object" && value.kind) walk(value);
    }
  };
  walk(fn.node?.body);
  const eligible=entries.filter(e=>e.reg!==REG_NONE &&
    (e.d.type.kind!=="float" || e.d.registerHint==="alloc"));
  scoreSort(eligible);
  const ordered=eligible.filter(e=>e.score && !addrTaken.has(e.name) &&
    !e.escape && e.d.type.kind!=="class");
  if (!disabled) {
    if (ordered.length>GENERAL_REGS.length) {
      let i=0;
      for (const e of ordered)
        if (i<NON_POINTER_REGS.length &&
            !["ptr","funcptr","array"].includes(e.d.type.kind)) e.reg=NON_POINTER_REGS[i++];
    }
    let i=0;
    for (const e of ordered)
      if (i<GENERAL_REGS.length && e.d.type.kind!=="array" &&
          (e.reg===REG_UNDEF || e.reg===REG_ALLOC)) e.reg=GENERAL_REGS[i++];
  }
  return entries;
}
