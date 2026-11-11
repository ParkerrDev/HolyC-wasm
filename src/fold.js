function Integer(value,unsigned=false)
{
  return {value:BigInt.asIntN(64,value),unsigned};
}

function Binary(op,a,b)
{
  const unsigned=a.unsigned || b.unsigned;
  const x=unsigned?BigInt.asUintN(64,a.value):a.value;
  const y=unsigned?BigInt.asUintN(64,b.value):b.value;
  let value;
  switch (op) {
    case "+": value=x+y; break;
    case "-": value=x-y; break;
    case "*": value=x*y; break;
    case "/": if (!y) throw new Error("division by zero in constant"); value=x/y; break;
    case "%": if (!y) throw new Error("division by zero in constant"); value=x%y; break;
    case "<<": value=x<<(y&63n); break;
    case ">>": value=x>>(y&63n); break;
    case "&": value=x&y; break;
    case "|": value=x|y; break;
    case "^": value=x^y; break;
    case "==": return Integer(x===y?1n:0n);
    case "!=": return Integer(x!==y?1n:0n);
    case "<": return Integer(x<y?1n:0n);
    case ">": return Integer(x>y?1n:0n);
    case "<=": return Integer(x<=y?1n:0n);
    case ">=": return Integer(x>=y?1n:0n);
    case "`": {
      const n=Math.pow(Number(x),Number(y));
      if (!Number.isFinite(n)) return null;
      return Integer(BigInt(Math.trunc(n)));
    }
    default: return null;
  }
  return Integer(value,unsigned);
}

function Fold(node,env)
{//Keep the signedness and 64-bit wrap of the run-time expression.
  if (!node) return null;
  switch (node.kind) {
    case "IntLit": case "CharLit": {
      const value=BigInt(node.value);
      return Integer(value,BigInt.asIntN(64,value)<0n);
    }
    case "Ident": return node.name in env?Integer(BigInt(env[node.name])):null;
    case "Cast": {
      const a=Fold(node.operand,env),t=node.type;
      if (!a || t.kind!=="int") return null;
      if (node.postfix) return Integer(a.value,!t.signed);
      return Integer(t.signed?BigInt.asIntN(t.bits,a.value):
        BigInt.asUintN(t.bits,a.value),!t.signed);
    }
    case "Unary": {
      const a=Fold(node.operand,env);
      if (!a) return null;
      switch (node.op) {
        case "-": return Integer(-a.value);
        case "+": return a;
        case "~": return Integer(~a.value,a.unsigned);
        case "!": return Integer(a.value?0n:1n);
      }
      return null;
    }
    case "Binary": {
      const a=Fold(node.left,env),b=Fold(node.right,env);
      return a && b?Binary(node.op,a,b):null;
    }
    case "Logical": {
      const a=Fold(node.left,env),b=Fold(node.right,env);
      if (!a || !b) return null;
      const x=!!a.value,y=!!b.value;
      return Integer((node.op==="&&"?x&&y:node.op==="||"?x||y:x!==y)?1n:0n);
    }
    case "Chain": {
      const values=node.operands.map(x=>Fold(x,env));
      if (values.some(v=>!v)) return null;
      return Integer(node.ops.every((op,i)=>Binary(op,values[i],values[i+1]).value)?1n:0n);
    }
    case "Cond": {
      const a=Fold(node.cond,env);
      return a?Fold(a.value?node.then:node.else,env):null;
    }
    default: return null;
  }
}

export function foldConstInt(node,env={})
{
  return Fold(node,env)?.value??null;
}

export function foldDim(node,env={})
{
  if (node==null) return null;
  if (typeof node==="number") return node;
  if (typeof node==="bigint") return Number(node);
  const value=foldConstInt(node,env);
  if (value==null) throw new Error("array dimension is not a constant integer at line "+(node.line||"?"));
  if (value<0n || value>BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("array dimension outside supported memory at line "+(node.line||"?"));
  return Number(value);
}
