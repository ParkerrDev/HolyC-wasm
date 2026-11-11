import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Hash} from '../oracle/Prepare.mjs';
export function source() {
 const parts=['I64 rt_id=0;\n\nU0 RtVal(I64 value)\n{\n  "VAL:%d:%016X\\n",rt_id++,value;\n}\n'],calls=[];
 const types=['I8','U8','I16','U16','I32','U32','I64','U64','Bool'];
 const values=['0','255','0x1000001FF','-257','0x80000000','0xFFFFFFFF80000080','0x8000000000000000'];
 const fun=(type,name,args,body)=>parts.push(`${type} ${name}(${args})\n{\n${body}\n}\n`);
 for(const [i,type] of types.entries()) {
  const prefix='Rt'+i;
  parts.push(`${type} rt_global_${i}=0;\n`);
  const variants=[['Value','I64 value','  return value;'],
   ['Reg','I64 value',`  ${type} res=value;\n  return res;`],
   ['Mem','I64 value',`  ${type} noreg res=value;\n  return res;`],
   ['Static','I64 value',`  static ${type} res=0;\n  res=value;\n  return res;`],
   ['Global','I64 value',`  rt_global_${i}=value;\n  return rt_global_${i};`],
   ['Cast','I64 value',`  return value(${type});`],
   ['CastMem','I64 noreg value',`  return value(${type});`],
   ['Relay','I64 value',`  return ${prefix}Value(value);`],
   ['Try','I64 value',`  ${type} res=value;\n  try {\n    res++;\n  } catch\n    Fs->catch_except=TRUE;\n  return res;`]];
  for(const [suffix,args,body] of variants) {
   fun(type,prefix+suffix,args,body);
   for(const value of values)calls.push(`RtVal(${prefix+suffix}(${value}));`);
  }
  fun(type,prefix+'Literal','','  return 0x1000001FF;');calls.push(`RtVal(${prefix}Literal);`);
  fun(type,prefix+'Float','F64 value','  return value;');
  for(const value of ['257.75','-257.75','2147483649.5'])calls.push(`RtVal(${prefix}Float(${value}));`);
  parts.push(`${type} (*rt_ptr_${i})(I64)=&${prefix}Value;\n`);
  calls.push(`RtVal(rt_ptr_${i}(0x1000001FF));`);
  fun('I64',prefix+'Context','I64 value',`  ${type} reg_res=${prefix}Value(value),\n\tnoreg mem_res=${prefix}Value(value);\n  RtVal(reg_res);RtVal(mem_res);\n  return ${prefix}Value(value)+1;`);
  calls.push(`RtVal(${prefix}Context(0x1000001FF));`);
 }
 fun('F64','RtFloat','I64 value','  return value;');
 fun('I64','RtFloatBits','I64 value','  F64 res=RtFloat(value);\n  return res(I64);');
 for(const value of ['0','257','-257','2147483649'])calls.push(`RtVal(RtFloatBits(${value}));`);
 return parts.join('\n')+'\n'+calls.join('\n')+'\n';
}
export function recorded(name='Returns') {
 const bytes=name==='Returns'?Buffer.from(source(),'latin1'):readFileSync(new URL(name+'.HC',import.meta.url));
 const proof=JSON.parse(readFileSync(new URL(name+'.native.json',import.meta.url)));
 assert.equal(proof.sourceSha256,Hash(bytes));
 assert.equal(proof.runnerSha256,Hash(readFileSync(new URL('../oracle/Qemu.mjs',import.meta.url))));
 assert.equal(proof.captureSha256,Hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url))));
 const output=readFileSync(new URL(name+'.native.out',import.meta.url),'latin1');
 assert.equal(proof.outputSha256,Hash(Buffer.from(output,'latin1')));
 assert.equal(proof.except,'');assert.equal(proof.backend.engine,'qemu');
 return {source:bytes,output,proof};
}
