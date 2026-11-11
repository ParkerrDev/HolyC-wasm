import {SCALE_BYTES} from "./float-scale.js";

const scales=Uint8Array.from(atob(SCALE_BYTES),ch=>ch.charCodeAt(0));
const data=new DataView(scales.buffer),out=new DataView(new ArrayBuffer(8));

function Round(value,shift)
{//Round an unsigned significand to nearest, ties to even.
  if (shift<=0) return value<<BigInt(-shift);
  const bits=BigInt(shift),half=1n<<(bits-1n),low=value&((1n<<bits)-1n);
  let high=value>>bits;
  if (low>half || low===half && high&1n) high++;
  return high;
}

function Product(integer,scale)
{//FILD and FMUL at 64-bit x87 precision, followed by an F64 store.
  if (!integer || !scale) return 0;
  const negative=integer<0n;
  if (negative) integer=-integer;
  const field=Number(scale>>52n),fraction=scale&0xFFFFFFFFFFFFFn;
  let exponent=field?field-1023-52:-1074;
  let value=integer*(field?fraction|0x10000000000000n:fraction);
  let shift=Math.max(0,value.toString(2).length-64);
  value=Round(value,shift);
  exponent+=shift;
  const top=exponent+value.toString(2).length-1;
  let bits;
  if (top>1023) bits=0x7FF0000000000000n;
  else if (top < -1022) bits=Round(value,-1074-exponent);
  else {
    shift=value.toString(2).length-53;
    value=Round(value,shift);
    exponent+=shift;
    if (value>=0x20000000000000n) {value>>=1n;exponent++;}
    const biased=exponent+52+1023;
    bits=biased>=2047?0x7FF0000000000000n:
      BigInt(biased)<<52n|value&0xFFFFFFFFFFFFFn;
  }
  if (negative) bits|=0x8000000000000000n;
  out.setBigUint64(0,bits,true);
  return out.getFloat64(0,true);
}

export function FloatLex(text)
{//Compiler/Lex.HC accumulates signed I64 digits, then multiplies Pow10I64.
  const match=/^(\d*)(?:\.(\d*))?(?:[eE](-?\d*))?$/.exec(text);
  if (!match) throw new Error("Invalid HolyC floating literal: "+text);
  const integer=BigInt.asIntN(64,BigInt((match[1]||"0")+(match[2]||"")));
  const exponent=BigInt.asIntN(64,BigInt(match[3]==="-"?"0":match[3]||"0"))-BigInt((match[2]||"").length);
  if (exponent>308n) return Number(integer)*Infinity;
  if (exponent < -308n) return Number(integer)*0;
  return Product(integer,data.getBigUint64((Number(exponent)+308)*8,true));
}
