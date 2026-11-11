import {bytesToLatin1} from './console.js';

export function lexDiagnostics(memory,onDiagnostic) {
  let last=null,error=null;
  function string(pointer,limit) {
    if(!pointer)return null;
    const bytes=new Uint8Array(memory().buffer),start=Number(pointer);
    if(!Number.isSafeInteger(start) || start<0 || start>=bytes.length)
      throw new RangeError('Lex diagnostic pointer is outside memory');
    const view=bytes.subarray(start,Math.min(bytes.length,start+limit+1)),end=view.indexOf(0);
    if(end<0)throw new RangeError('Lex diagnostic string is unterminated or too long');
    return bytesToLatin1(view.subarray(0,end));
  }
  return {
    get last(){return last;},
    get error(){return error;},
    report(task,code,reason,filename,line,offset,column,token,lastLine) {
      last=null;error=null;
      try {
        const tag=[];
        for(let n=BigInt.asUintN(64,code);n;n>>=8n)tag.push(Number(n&255n));
        last=Object.freeze({task,code,category:bytesToLatin1(tag),
          reason:string(reason,143),filename:string(filename,4096),
          line,offset,column,token,lastLine});
        const result=onDiagnostic?.(last);
        if(result && typeof result.then==='function') {
          Promise.resolve(result).catch(()=>{});
          throw new TypeError('Lex diagnostic callbacks must be synchronous');
        }
      } catch(cause) {
        // The HolyC caller still raises its own category and runs its cleanup.
        error=cause;
      }
    },
  };
}
