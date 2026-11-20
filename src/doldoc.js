function DocText(source)
{//The document text ends at the NUL before its binary records.
  const end=source.indexOf("\0");
  return end<0?source:source.slice(0,end);
}

export function DocCmds(source)
{//Each $...$ command of the text, in order; $$ is a literal dollar.
  const text=DocText(source),cmds=[];
  let i=0;
  while (i<text.length) {
    if (text[i]!=="$") {i++;continue;}
    if (text[i+1]==="$") {i+=2;continue;}
    let j=i+1,quoted=false;
    while (j<text.length) {
      if (text[j]==="\\") j++;
      else if (text[j]==='"') quoted=!quoted;
      else if (text[j]==="$" && !quoted) break;
      j++;
    }
    cmds.push(text.slice(i+1,j));
    i=j+1;
  }
  return cmds;
}

const BinNum=cmd=>Number(/(?:^|,)BI=(\d+)(?:,|$)/.exec(cmd)?.[1]??0);
const BinTag=cmd=>/^[A-Z][A-Z0-9]*(?:[-+][^,]*)?,"((?:[^"\\]|\\.)*)"/.exec(cmd)?.[1]??"";
const BinLink=cmd=>/(?:^|,)BP="((?:[^"\\]|\\.)*)"/.exec(cmd)?.[1];

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

export function DocBinsLoad(source,filename,open,depth=0)
{//DocLoad: a BP="file,tag" or BP="file,num" entry copies that document's
//bin over its own BI number (Adam/DolDoc/DocBin.HC:97, DocBinPtrRst).
  const bins=DocBins(source,filename);
  if (!open || depth>8) return bins;
  const cmds=DocCmds(source);
  for (const cmd of cmds) {
    const link=BinLink(cmd),num=BinNum(cmd);
    if (link===undefined || !num) continue;
    const comma=link.lastIndexOf(","),path=comma<0?"":link.slice(0,comma),
      key=comma<0?link:link.slice(comma+1),want=parseInt(key,10)||0;
    const doc=path && open(path,filename),found=doc &&
      DocBinFind(doc.source,doc.filename,open,depth,want,key);
    if (found) bins.set(num,found);
    else bins.delete(num);
  }
  return bins;
}

function DocBinFind(source,filename,open,depth,num,tag)
{//DocBinsValidate renumbers a document's bins by first use and tags each
//from its first tagged entry; DocBinFindNum and DocBinFindTag search that.
  const bins=DocBinsLoad(source,filename,open,depth+1),renum=new Map(),
    tags=new Map();
  for (const cmd of DocCmds(source)) {
    const n=BinNum(cmd);
    if (!n || !bins.has(n)) continue;
    if (!renum.has(n)) renum.set(n,renum.size+1);
    const t=BinTag(cmd);
    if (t && !tags.has(n)) tags.set(n,t);
  }
  for (const [n,r] of renum)
    if (num>0?r===num:!num && tags.get(n)===tag) return bins.get(n);
  return null;
}
