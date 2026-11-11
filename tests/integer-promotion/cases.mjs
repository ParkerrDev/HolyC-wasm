import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const kinds=['I8','U8','I16','U16','I32','U32','I64','U64'];
const head='I64 pm_id=0;\n\nU0 PmVal(I64 value)\n{\n  "%d:%016X\\n",pm_id++,value;\n}\n';
const body=(name,code,args='')=>`\nU0 ${name}(${args})\n{\n${code}\n}\n`;
const values=ops=>ops.map(op=>`  PmVal(${op});`).join('\n');
function fields(name,types,names){
 const groups=new Map();types.forEach((type,i)=>groups.set(type,[...(groups.get(type)??[]),names[i]]));
 return `\nclass ${name}\n{\n${[...groups].map(([type,names])=>'  '+type+' '+names.join(',')+';').join('\n')}\n};\n`;
}
function finish(code,name,calls){return head+code+body(name,'  pm_id=0;\n'+calls.map(call=>'  '+call+';').join('\n'))+'\n'+name+';\n';}
export const memoryOps=['v.a','v.b','v.a/v.b','v.a%v.b','v.a<v.b','v.a<=v.b','v.a>v.b','v.a>=v.b','v.a==v.b','v.a!=v.b','v.a>>v.b','(v.a+v.b)/div','(v.a-v.b)/div','v.a*v.b/div','(v.a|v.b)/div','(v.a&v.b)/div','(v.a^v.b)/div','~v.a/div','-v.a/div','v.a<v.b<div'];
function memory(){
 let code='',calls=[];
 kinds.forEach((a,i)=>kinds.forEach((b,j)=>{
  const n=i*8+j;
  code+=fields('CPm'+n,[a,b],['a','b']);
  code+=body('Pm'+n,`  CPm${n} v;\n  I64 div=3;\n  v.a=av;v.b=bv;\n`+values(memoryOps)+'\n  PmVal(v.a/=v.b);PmVal(v.a);\n  v.a=av;PmVal(v.a%=v.b);PmVal(v.a);','I64 av,I64 bv');
  for(const [a,b] of [[-23,12],[23,-12],[-127,7]])calls.push(`Pm${n}(${a},${b})`);
 }));return finish(code,'PromotionMemory',calls);
}
export function constantOps(a,b){
 const x=`0xFFFFFFFFFFFFFFE9(${a})`,y=`12(${b})`;
 return [x+'/'+y,x+'%'+y,x+'>>'+y,'('+x+'+'+y+')/3','('+x+'-'+y+')/3','('+x+'^'+y+')/3','~'+x+'/3','-'+x+'/3',x+'+'+y+'<0','~'+x+'<0'];
}
function constants(){
 let code='',calls=[];
 kinds.forEach((a,i)=>kinds.forEach((b,j)=>{const name='PmC'+(i*8+j);code+=body(name,values(constantOps(a,b)));calls.push(name);}));
 return finish(code,'PromotionConstant',calls);
}
function chains(){
 let code=fields('CPmChain',kinds,kinds.map(t=>t.toLowerCase()+'s[4]'));
 let work='  CPmChain v;\n';
 for(const t of kinds)for(let i=0;i<4;i++)work+=`  v.${t.toLowerCase()}s[${i}]=${'abcd'[i]};\n`;
 for(const t of kinds)for(let i=0;i<4;i++)for(const ops of [['<','<','<'],['>','>','>'],['==','<','<']]){
  const operands=Array.from({length:4},(_,j)=>`v.${(i===j?t:'I64').toLowerCase()}s[${j}]`);
  const expr=operands.map((x,j)=>x+(ops[j]??'')).join('');
  work+=`  PmVal(${expr});\n  if (${expr})\n    PmVal(1);\n  else\n    PmVal(0);\n`;
 }
 code+=body('ChainRun',work.trimEnd(),'I64 a,I64 b,I64 c,I64 d');
 const args=[[-3,-2,-1,0],[0,-3,-2,-1],[-2,-2,-1,0],[1,2,-3,-2],[3,2,1,0],[3,2,-1,-2],[0,0,-1,1],[-1,-1,1,2]];
 return finish(code,'PromotionChain',args.map(a=>'ChainRun('+a.join(',')+')'));
}
export const shapeOps=['a','a>>2(U64)','a>>count','a>>uc','a/8','a/8/divisor','a/8>>uc','a/8<0','a>>2<0','a>>2/divisor','a/12(U16)','a%12(U16)','a+0<0','a-0<0','a*1<0','a|0<0','a^0<0','a&0xFFFFFFFFFFFFFFFF<0','~a+0<0','~a-0<0','~a*1<0','~a|0<0','~a^0<0','~a<0','a*2/divisor','a*8/divisor','(a-1)/divisor','(a+1)/divisor'];
// Shift binds more tightly than division in HolyC: this one needs grouping.
shapeOps[6]='(a/8)>>uc';
function shapes(){
 let code='',calls=[];
 kinds.forEach((t,n)=>{
  code+=fields('CShape'+n,[t,'U16','U16','U64'],['a','count','divisor','uc']);
  code+=body('Shape'+n,`  CShape${n} v;\n  v.a=av;v.count=2;v.divisor=12;v.uc=2;\n`+values(shapeOps.map(op=>op.replace(/\b(a|count|uc|divisor)\b/g,'v.$1'))),'I64 av');
  for(const value of ['-23','0x8000000000000000','0x7FFFFFFFFFFFFFFF'])calls.push(`Shape${n}(${value})`);
 });return finish(code,'PromotionShape',calls);
}
function statics(){
 const expressions=kinds.flatMap(a=>kinds.flatMap(b=>constantOps(a,b)));
 let code='\nI64 pm_values[640]={\n'+expressions.map(x=>'  '+x).join(',\n')+'\n};\n';
 kinds.forEach((a,i)=>kinds.forEach((b,j)=>{
  const n=i*8+j,expr=constantOps(a,b)[3];
  code+=`\nI64 pm_dim${n}[2+(${expr}<0)];\n\nI64 PmDefault${n}(I64 value=${expr})\n{\n  return value;\n}\n`;
 }));
 code+=body('StaticRun','  I64 i;\n  for (i=0;i<640;i++)\n    PmVal(pm_values[i]);\n'+Array.from({length:64},(_,i)=>`  PmVal(sizeof(pm_dim${i}));PmVal(PmDefault${i});`).join('\n'));
 return finish(code,'PromotionStatic',['StaticRun']);
}
export const optOps=[];
for(const value of [0,1,2,8])for(const t of ['I64','U64']){
 const c=`${value}(${t})`;
 for(const op of ['+','-','*','/','<<','>>']){
  if(op==='/' && !value)continue;
  const expressions=[`v.a${op}${c}`];if(op==='+' || op==='*')expressions.push(`${c}${op}v.a`);
  for(const expr of expressions){optOps.push(`${expr}<0`);optOps.push(['+','-'].includes(op)?`(${expr})/v.divisor`:`${expr}/v.divisor`);}
 }
}
function optimizations(){
 let code='',calls=[];
 ['I8','U8','I64','U64'].forEach((t,n)=>{
  code+=fields('CPmOpt'+n,[t,'U16'],['a','divisor']);
  code+=body('Opt'+n,`  CPmOpt${n} v;\n  v.a=-23;v.divisor=12;\n`+values(optOps));calls.push('Opt'+n);
 });return finish(code,'PromotionOpt',calls);
}
function constantChains(){
 const expressions=[];
 for(const t of kinds)for(let i=0;i<4;i++)for(const ops of [['<','<','<'],['>','>','>'],['==','<','<']])
  for(const values of [[0,1,2,-1],[-3,-2,-1,0],[1,1,2,-1],[3,2,-1,-2]]){
   const operands=values.map((v,j)=>`${BigInt.asUintN(64,BigInt(v))>0x7FFFFFFFFFFFFFFFn?'0x'+BigInt.asUintN(64,BigInt(v)).toString(16).toUpperCase():v}(${i===j?t:'I64'})`);
   expressions.push(operands[0]+ops[0]+operands[1]+ops[1]+'\n\t'+operands[2]+ops[2]+operands[3]);
  }
 const data='\nI64 pm_chain[384]={\n'+expressions.map(x=>'  '+x).join(',\n')+'\n};\n';
 const work='  I64 i;\n'+values(expressions)+'\n  for (i=0;i<384;i++)\n    PmVal(pm_chain[i]);';
 return finish(data+body('ChainConstRun',work),'PromotionConstChain',['ChainConstRun']);
}
export const cases={Memory:memory(),Constant:constants(),Chain:chains(),Shape:shapes(),Static:statics(),Optimize:optimizations(),ConstantChain:constantChains()};
export function fixture(name){
 const source=Buffer.from(cases[name],'latin1');
 return {source,identity:{sourceSha256:hash(source),captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))}};
}
export function recorded(name){
 const test=fixture(name),proof=JSON.parse(readFileSync(new URL(name+'.native.json',import.meta.url))),output=readFileSync(new URL(name+'.out',import.meta.url),'latin1');
 for(const [key,value] of Object.entries(test.identity))assert.equal(proof[key],value,key);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.except,'');
 assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
 return {...test,output};
}
