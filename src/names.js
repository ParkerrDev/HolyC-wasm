// names.js - the names a part of the program's tree refers to.
//
// A part compiled at run time links to the functions and globals it names
// (codegen.js runSegment), and the program's compile keeps those linked.

export function Walk(nodes,visit) {
  const seen=new Set(),stack=[...nodes];
  while (stack.length) {
    const node=stack.pop();
    if (!node || typeof node!=="object" || seen.has(node)) continue;
    seen.add(node);
    visit(node);
    for (const value of Object.values(node))
      if (Array.isArray(value)) for (const item of value) stack.push(item);
      else if (value && typeof value==="object") stack.push(value);
  }
}

// Identifiers, members as ".name", and implicit calls emitted by flag instructions.
export function Names(nodes) {
  const names=new Set();
  Walk(nodes,node=>{
    if (node.kind==="Ident" && typeof node.name==="string") names.add(node.name);
    else if (node.kind==="FlagOps") {
      for (const op of node.ops) {
        if (op==="PUSHFD" || op==="CLI" || op==="STI") names.add("GetRFlags");
        if (op==="POPFD" || op==="CLI" || op==="STI") names.add("SetRFlags");
      }
    } else if (node.kind==="Member" && typeof node.name==="string") names.add("."+node.name);
  });
  return names;
}

// The identifiers inside string literals: text the program may compile.
export function StrWords(nodes) {
  const words=new Set();
  Walk(nodes,node=>{
    if (node.kind!=="StrLit" || !Array.isArray(node.bytes)) return;
    const text=String.fromCharCode(...node.bytes.slice(0,4096));
    for (const word of text.match(/[A-Za-z_][A-Za-z0-9_]*/g)??[]) words.add(word);
  });
  return words;
}
