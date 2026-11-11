export function DocBins(source,filename)
{//Adam/DolDoc/DocFile.HC: text, NUL, then CDocBin.start..end and data.
  const bins=new Map(),end=source.indexOf("\0");
  if (end<0) return bins;
  const u32=at=>source.charCodeAt(at)+source.charCodeAt(at+1)*0x100+
    source.charCodeAt(at+2)*0x10000+source.charCodeAt(at+3)*0x1000000;
  let at=end+1;
  while (at+16<=source.length) {
    const num=u32(at),size=u32(at+8);
    at+=16;
    if (!num || bins.has(num) || at+size>source.length)
      throw new Error(`${filename}: invalid DolDoc binary record ${num} at byte ${at-16}`);
    const bytes=[];
    for (let i=0;i<size;i++) bytes.push(source.charCodeAt(at+i));
    bins.set(num,bytes);
    at+=size;
  }
  return bins;
}
