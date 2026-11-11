//The native volume owns paths, lookup, storage and quotas. This bridge only
//copies exact bytes into its seed API and copies the resulting entries out.
export function fileBridge(files,getNative) {
  let pending=files??[],error=null;
  if(!Array.isArray(pending)) throw new TypeError('HolyC files must be an array of byte-path entries');
  function bytes(value,path=false) {
    if(value instanceof Uint8Array) return value;
    if(path && typeof value==='string') {
      const result=new Uint8Array(value.length);
      for(let i=0;i<value.length;i++) {
        const ch=value.charCodeAt(i);
        if(ch>255) throw new TypeError('Encode non-byte filenames as CP437 before seeding');
        result[i]=ch;
      }
      return result;
    }
    throw new TypeError(path?'A seed path must contain exact bytes':'Seed file contents must be Uint8Array');
  }
  function seedNative() {
    const fn=getNative(),maxPath=Number(fn.DirHostMaxPath()),maxBytes=Number(fn.DirHostMaxBytes());
    const entries=[];let total=0;
    try {
      if(pending.length>Number(fn.DirHostMaxNodes())) throw new RangeError('Too many seed entries');
      for(const entry of pending) {
        if(!entry || typeof entry!=='object' || entry.path?.length>maxPath)
          throw new RangeError('Invalid or oversized seed path');
        const path=bytes(entry.path,true),directory=entry.directory===true;
        if(!path.length || path.includes(0)) throw new TypeError('Seed paths cannot be empty or contain NUL');
        const data=directory?new Uint8Array():bytes(entry.bytes);
        if(directory && entry.bytes?.length) throw new TypeError('A directory cannot contain file bytes');
        total+=data.length;
        if(total>maxBytes) throw new RangeError('Seed file bytes exceed the native volume limit');
        entries.push({path,data,directory});
      }
    } catch(cause) {error=cause;return 0n;}
    for(const {path,data,directory} of entries) {
      let name=0n,buffer=0n;
      try {
        name=fn.MAlloc(BigInt(path.length+1),0n);
        let memory=new Uint8Array(fn.memory.buffer);
        memory.set(path,Number(name));memory[Number(name)+path.length]=0;
        if(data.length) {
          buffer=fn.MAlloc(BigInt(data.length),0n);
          new Uint8Array(fn.memory.buffer).set(data,Number(buffer));
        }
        if(!fn.DirHostSeed(name,buffer,BigInt(data.length),BigInt(directory))) {
          error=new Error('Native volume rejected a seed path or entry type');return 0n;
        }
      } finally {fn.Free(buffer);fn.Free(name);}
    }
    pending=[];error=null;return 1n;
  }
  function entriesNative() {
    const fn=getNative();
    if(!fn?.DirHostReady || !fn.DirHostReady()) throw new Error('This module has no initialized HolyC volume');
    const result=[],maxPath=Number(fn.DirHostMaxPath()),maxNodes=Number(fn.DirHostMaxNodes());
    for(let node=fn.DirHostNext(0n);node;node=fn.DirHostNext(node)) {
      if(result.length>=maxNodes) throw new RangeError('Invalid native volume node chain');
      const name=fn.DirHostName(node);
      let path;
      try {
        const memory=new Uint8Array(fn.memory.buffer),start=Number(name);
        let end=start;
        while(end<memory.length && memory[end] && end-start<=maxPath) end++;
        if(end>=memory.length || end-start>maxPath) throw new RangeError('Invalid native volume path');
        path=memory.slice(start,end);
      } finally {fn.Free(name);}
      const directory=Boolean(fn.DirHostIsDir(node)),entry={path,directory};
      if(!directory) {
        const start=Number(fn.DirHostData(node)),size=Number(fn.DirHostSize(node));
        const memory=new Uint8Array(fn.memory.buffer);
        if(!Number.isSafeInteger(size) || size<0 || size>Number(fn.DirHostMaxBytes()) ||
            !Number.isSafeInteger(start) || start<0 || start+size>memory.length)
          throw new RangeError('Invalid native volume file extent');
        entry.bytes=memory.slice(start,start+size);
      }
      result.push(entry);
    }
    return result;
  }
  function call(action) {
    const stack=getNative()?.__sp,saved=stack?.value;
    try {return action();}
    finally {if(stack)stack.value=saved;}
  }
  return {seed:()=>call(seedNative),entries:()=>call(entriesNative),
    get error(){return error;}};
}
