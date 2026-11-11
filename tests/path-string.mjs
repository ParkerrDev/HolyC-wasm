import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createHost} from '../src/runtime/host.js';
const source=`
U8 path_input[513];
I64 PathTrial(I64 mode) {
  U8 *ptr=NULL;
  I64 i,res=0;
  MemSet(path_input,'\\t',128);
  StrCpy(path_input+128,"Text\\n\\t End");
  try {
    switch(mode) {
      case 0: ptr=Tabs2Spaces(path_input); break;
      case 1: ptr=ScaleIndent(path_input,2.5); break;
      case 2: ptr=MStrUtil(path_input,SUF_T2S|SUF_SCALE_INDENT,0.5); break;
      case 3: ptr=MStrUtil(path_input,SUF_TO_UPPER); break;
    }
  } catch {res=Fs->except_ch;Fs->catch_except=TRUE;}
  for(i=0;i<128;i++) if(path_input[i]!='\\t') throw('Source');
  if(StrCmp(path_input+128,"Text\\n\\t End")) throw('Source');
  Free(ptr);
  return res;
}
`;
const result=compileHolyC(source,{lenient:false,exports:['PathTrial']});assert.deepEqual(result.warnings,[]);
const host=createHost(),malloc=host.env.__malloc;
let calls=0,failAt=0;
host.env.__malloc=size=>++calls===failAt?0n:malloc(size);
const instance=new WebAssembly.Instance(new WebAssembly.Module(result.bytes),{env:host.env});host.attach(instance);
instance.exports.__rt_init();let faults=0;
for(let mode=0;mode<4;mode++) {
  calls=0;failAt=0;assert.equal(instance.exports.PathTrial(BigInt(mode)),0n);
  const sites=calls;assert(sites>0);
  for(let repeat=0;repeat<20;repeat++) for(let failure=1;failure<=sites;failure++) {
    calls=0;failAt=failure;
    assert.equal(instance.exports.PathTrial(BigInt(mode)),0x6D654D74754Fn);
    assert.equal(host.state.heapPtr,16777248);assert.equal(instance.exports.__sp.value,16777216n);
    calls=0;failAt=0;assert.equal(instance.exports.PathTrial(BigInt(mode)),0n);
    assert.equal(host.state.heapPtr,16777248);faults++;
  }
}
console.log(`Path strings: ${faults} internal allocation failures release temporary buffers, preserve input and stack, and allow immediate retry.`);
