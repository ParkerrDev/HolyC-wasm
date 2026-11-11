import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const types=['I8','U8','I16','U16','I32','U32','I64','U64','Bool'];
const head='I64 rg_id=0;\n\nU0 RgVal(I64 value)\n{\n  "VAL:%d:%016X\\n",rg_id++,value;\n}\n';
const val=expr=>'  RgVal('+expr+');';
function declaration(type,vars){
 let lines=[],line='  '+type+' ';
 for(let i=0;i<vars.length;i++){
  const part=vars[i]+(i===vars.length-1?';':',');
  if(line.length+part.length>76){lines.push(line);line='\t';}
  line+=part;
 }return [...lines,line].join('\n');
}
function testSet(name){
 const names=[],calls=[],parts=[head];
 return {names,calls,parts,
  fun(name,args,body,returns='I64'){
   names.push(name);parts.push(`\n${returns} ${name}(${args})\n{\n${body}\n}\n`);
  },
  finish(){
   parts.push(`\nU0 Reg${name}Run()\n{\n  rg_id=0;\n${calls.map(c=>'  '+c+';').join('\n')}\n}\n\nReg${name}Run;\n`);
   const wrapper='U0 RegDump(U8 *name)\n{\n  CHashFun *tmpf=HashFind(name,Fs->hash_table,HTT_FUN);\n  CMemberLst *tmpm=tmpf->member_lst_and_root;\n  while (tmpm) {\n    "REG:%s:%s:%d:%d:%d\\n",name,tmpm->str,tmpm->reg,\n\ttmpm->offset,tmpm->size;\n    tmpm=tmpm->next;\n  }\n}\n'+names.map(n=>'RegDump("'+n+'");\n').join('');
   return {source:parts.join(''),wrapper,names};
  }
 };
}
function basic(){
 const set=testSet('Basic');
 types.forEach((t,n)=>{
  const variants=[
   ['Init',`${t} res=value;\n  return res;`],
   ['Assign',`${t} res;\n  res=value;\n  return res;`],
   ['NoReg',`${t} noreg res=value;\n  return res;`],
   ['Reg',`${t} reg res=value;\n  return res;`],
   ['Addr',`${t} res=value,*ptr=&res;\n  return *ptr;`],
   ['Round',`${t} res;\n  *&res=value;\n  return res;`],
   ['Inc',`${t} res=value;\n  res++;\n  return res;`],
   ['Add',`${t} res=value;\n  res+=3;\n  return res;`],
   ['Cast',`${t} res;\n  res(${t})=value;\n  return res;`],
   ['ReadCast',`${t} res=value;\n  return res(${t});`]
  ];
  for(const [suffix,body] of variants)set.fun('Rg'+n+suffix,'I64 value','  '+body);
  set.fun('Rg'+n+'Param',t+' value','  return value;');
  set.fun('Rg'+n+'ParamMem','noreg '+t+' value','  return value;');
 });
 for(let count=1;count<=12;count++)set.fun('RgPressure'+count,'I64 value',pressure(count));
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x100000180))');
 return set.finish();
}
const vars=count=>Array.from({length:count},(_,i)=>'v'+i);
const pressure=(count,middle='',type='U16',extra=[])=>declaration(type,[...vars(count).map((v,i)=>v+'=value+'+i),...extra])+'\n'+middle+
 vars(count).map(val).join('\n')+'\n  return '+vars(count).join('+')+';';
function control(){
 const set=testSet('Control');
 types.forEach((t,n)=>{
  const cases=[['Try',`  ${t} res=value;\n  try {\n    res++;\n  } catch {\n    Fs->catch_except=TRUE;\n  }\n  return res;`,'I64 value'],
   ['ParamSet','  value=0x100000180;\n  value++;\n  return value;',t+' value'],
   ['ParamSetNo','  value=0x100000180;\n  value++;\n  return value;','noreg '+t+' value']];
  if(!['I8','U8','Bool'].includes(t))cases.push(['Union',`  ${t} res=value;\n  return res.u8[0];`,'I64 value']);
  for(const [suffix,body,args] of cases)set.fun('RgControl'+n+suffix,args,body);
 });
 const work=[
  '  I64 i;\n  for (i=0;i<3;i++) {\n    v0++;v1+=v0;\n  }\n',
  '  if (FALSE) {\n    v0++;v0++;v1+=v0;v1+=v0;\n  }\n',
  '  if (value==7) {\n    v0++;v0++;v1+=v0;v1+=v0;\n  }\n',
  '  I64 i=0;\n  while (FALSE) {\n    v0+=i;v1++;i++;\n  }\n',
  '  if (v0<v1<v2<v3)\n    v4++;\n',
  '  switch (v0) {\n    case 0:\n      v1++;break;\n    case 1:\n      v2++;break;\n    default:\n      v3++;\n  }\n'
 ];
 for(const count of [6,8,10,12])work.forEach((body,i)=>set.fun(`RgControlP${count}M${i}`,'I64 value',pressure(count,body)));
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x1000001FF))');
 return set.finish();
}
function ops(){
 const set=testSet('Ops');
 const limits=['0x7F','0xFF','0x7FFF','0xFFFF','0x7FFFFFFF','0xFFFFFFFF','0x3FFFFFFFFFFFFFFF','0x7FFFFFFFFFFFFFFF','0x7F'];
 types.forEach((t,n)=>{for(const mode of ['','noreg ','reg ']){
  const name='RgOp'+n+set.names.length,body=[`  ${t} ${mode}res;`];
  for(const op of ['=value','+=3','-=3','*=3','/=3','%=3','<<=3','>>=3','&=0x7F','|=64','^=64'])
   body.push('  res=value;',`  RgVal(res${op});RgVal(res);`);
  for(const op of ['res++','++res','res--','--res'])body.push(`  res=value;RgVal(${op});RgVal(res);`);
  set.fun(name,'I64 value',body.join('\n'),'U0');
  set.calls.push(name+'(0x1000001FF)',name+'('+limits[n]+')');
 }});return set.finish();
}
function mixed(){
 const set=testSet('Mixed');set.parts.push('\nclass CRegMix\n{\n  U16 x;\n  I64 y;\n};\n');
 for(const count of [4,6,8,10])for(let mode=0;mode<11;mode++){
  const body=[declaration('U16',[...vars(count).map((v,i)=>(!i&&mode===7?'reg ':!i&&mode===8?'noreg ':'')+v+'=value+'+i),...([0,1,2,9].includes(mode)?['arr[4]']:[])])];
  if(mode===0)body.push('  arr[0]=value;RgVal(arr[0]);');
  if(mode===1)body.push('  arr[1]=value;RgVal(arr[1]);');
  if(mode===2)body.push('  arr[0]=value;arr[1]=value+1;RgVal(arr[0]);RgVal(arr[1]);');
  if(mode===3)body.push('  U8 buf[4];','  StrCpy(buf,"abc");RgVal(buf[0]);');
  if(mode===4||mode===5){
   const count=mode===4?2:6;
   body.push(declaration('U8',Array.from({length:count},(_,i)=>'*p'+i+'=0x1234+'+i)));
   for(let i=0;i<count;i++)body.push(`  p${i}++;RgVal(p${i});`);
  }
  if(mode===6)body.push('  F64 d0=1.0,d1=2.0;','  RgVal(d0+d1);');
  if(mode===7||mode===8)body.push('  v2++;v2++;v2++;RgVal(v2);');
  if(mode===9)body.push('  *arr=value;RgVal(*arr);');
  if(mode===10)body.push('  CRegMix rec;','  rec.x=value;rec.y=value;RgVal(rec.x);RgVal(rec.y);');
  body.push(...vars(count).map(val),'  return '+vars(count).join('+')+';');
  set.fun(`RgMixed${count}M${mode}`,'I64 value',body.join('\n'));
 }
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x1000001FF))');
 return set.finish();
}
function cast(){
 const set=testSet('Cast');
 for(const count of [4,8,10,12])for(const mode of ['Read','Write','Float']){
  const body=[declaration('I64',vars(count).map((v,i)=>v+'=value+'+i))];
  if(mode==='Float')body.push('  F64 d=1.2345;','  RgVal(d(U8));',...vars(count).map(val));
  else for(const v of vars(count))body.push(mode==='Read'?`  RgVal(${v}(U8));RgVal(${v});`:`  ${v}(U8)=3;RgVal(${v});`);
  body.push('  return '+vars(count).join('+')+';');
  set.fun(`RgCast${count}${mode}`,'I64 value',body.join('\n'));
 }
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x100000180))');
 return set.finish();
}
function anonymous(){
 const set=testSet('Anon');
 for(const count of [6,8,10])for(let anon=0;anon<4;anon++){
  const name=`RgAnon${count}N${anon}`;
  set.fun(name,[...Array(anon).fill('I64'),'I64 value'].join(','),pressure(count));
  set.calls.push('RgVal('+name+'('+[...Array(anon).fill('0'),'0x1000001FF'].join(',')+'))');
 }return set.finish();
}
function extra(){
 const set=testSet('Extra');set.parts.push('\nclass CRegOff\n{\n  U8 a;\n  U16 b;\n};\n');
 for(const count of [4,5,6,8,10])for(const index of ['0','sizeof(U8)-1','offset(CRegOff.b)-1','sizeof(U16)-1'])
  set.fun('RgExtra'+set.names.length,'I64 value',pressure(count,`  arr[${index}]=value;RgVal(arr[${index}]);\n`,'U16',['arr[4]']));
 for(const mode of ['reg ','noreg ',''])set.fun('RgExtra'+set.names.length,'I64 value',`  F64 ${mode}res=value;\n  RgVal(res);RgVal(res(U64));RgVal(res(U8));\n  res(U8)=3;RgVal(res(U64));\n  return 0;`);
 for(const mode of ['reg ','noreg ',''])set.fun('RgExtra'+set.names.length,'I64 value',`  U16 ${mode}res=value;\n  try {\n    res++;\n  } catch {\n    Fs->catch_except=TRUE;\n  }\n  return res;`);
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x1000001FF))');
 return set.finish();
}
function context(){
 const set=testSet('Context');set.parts.push('\nI64 rg_shadow=23;\nU8 rg_byte=7;\n');
 for(const count of [4,6,8,10]){
  const name='RgVarArgs'+count;
  set.fun(name,'I64 value,...',pressure(count,'  I64 sum=argc;\n  if (argc)\n    sum+=argv[0];\n  RgVal(sum);\n'));
  set.calls.push('RgVal('+name+'(0x1000001FF,17))');
  const other='RgStatic'+count;
  set.fun(other,'I64 value','  static U16 saved=0;\n'+pressure(count,'  saved++;RgVal(saved);\n'));
  set.calls.push('RgVal('+other+'(0x1000001FF))');
  const unused='RgUnused'+count;
  set.fun(unused,'I64 value',pressure(count,'  no_warn unused;\n','U16',['unused']));
  set.calls.push('RgVal('+unused+'(0x1000001FF))');
 }
 set.fun('RgGlobalAddr','I64 value','  I64 *ptr=&rg_shadow;\n  RgVal(*ptr);\n  U16 rg_shadow=value;\n  return rg_shadow;');
 set.fun('RgGlobalMember','I64 value','  RgVal(rg_shadow.u8[0]);\n  U16 rg_shadow=value;\n  return rg_shadow;');
 set.fun('RgForcedAddr','I64 value','  U16 reg res=value,*ptr=&res;\n  RgVal(*ptr);\n  return res;');
 for(const count of [4,5,6,8]){
  const name='RgArrayCast'+count;
  set.fun(name,'I64 value',pressure(count,'  U64 buf[1];\n  buf[0]=&rg_byte;RgVal(*buf(U8 *));\n'));
  set.calls.push('RgVal('+name+'(0x1000001FF))');
 }
 for(const name of ['RgGlobalAddr','RgGlobalMember','RgForcedAddr'])set.calls.push('RgVal('+name+'(0x1000001FF))');
 return set.finish();
}
function optimizer(){
 const set=testSet('Optimizer');
 const expressions=['v0*0','0*v0','v0*1','1*v0','v0/1','v0+0','0+v0',
  'v0-0','v0<<0','v0>>0','v0^0','v0|0','v0&0xFFFFFFFFFFFFFFFF',
  'v0/8*8','v0/8<0','v0(U8)+0','FALSE && v0','TRUE || v0','v0'];
 for(const count of [6,8,10]){
  let mode=0;
  for(const expr of expressions)for(const used of [true,false]){
   const work=used?'  RgVal('+expr+');\n':'  '+expr+';\n';
   set.fun(`RgOpt${count}M${mode++}`,'I64 value',pressure(count,work));
  }
  set.fun(`RgOpt${count}M${mode}`,'I64 value',pressure(count,
   '  switch (1) {\n    case 0:\n      v0++;break;\n    case 1:\n      v1++;break;\n    default:\n      v2++;\n  }\n'));
 }
 for(const name of set.names)set.calls.push('RgVal('+name+'(0x1000001FF))');
 return set.finish();
}
export const cases={Basic:basic(),Control:control(),Ops:ops(),Mixed:mixed(),Cast:cast(),Anon:anonymous(),Extra:extra(),Context:context(),Optimizer:optimizer()};
export function fixture(name){
 const test=cases[name],source=Buffer.from(test.source,'latin1'),wrapper=Buffer.from(test.wrapper,'latin1');
 return {source,wrapper,names:test.names,identity:{sourceSha256:hash(source),wrapperSha256:hash(wrapper),
  captureSha256:hash(readFileSync(new URL('../oracle/QemuCapture.HC',import.meta.url)))}};
}
export const observations=output=>output.split('\n').filter(line=>/^(VAL|REG):/.test(line));
export function recorded(name){
 const test=fixture(name),proof=JSON.parse(readFileSync(new URL(name+'.native.json',import.meta.url))),output=readFileSync(new URL(name+'.native.out',import.meta.url),'latin1');
 for(const [key,value] of Object.entries(test.identity))assert.equal(proof[key],value,key);
 assert.equal(proof.backend.engine,'qemu');assert.equal(proof.manifest.templeos,'V5.03');assert.equal(proof.except,'');
 assert.equal(proof.outputSha256,hash(Buffer.from(output,'latin1')));
 return {...test,output,values:observations(output).filter(line=>line.startsWith('VAL:')),
  registers:observations(output).filter(line=>line.startsWith('REG:')).map(line=>{
   const [,fun,name,reg,offset,size]=line.split(':');return {fun,name,reg:Number(reg),offset:Number(offset),size:Number(size)};
  })};
}
