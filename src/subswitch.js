import {mk} from "./ast.js";
import {T} from "./types.js";

//Native subswitch prefixes are local subroutines, called on case dispatch but
//skipped on case fall-through. Keep each prefix once, with a private return
//selector, so its labels and effects are not duplicated across case bodies.
export function subswitch(source,id,error)
{
  if (!source.items.some(item=>item.type==="start" || item.type==="end")) return source;
  let serial=0;
  const name=()=>`#switch:${id}:${serial++}`,
    node=(kind,props)=>mk(kind,props,source),
    label=value=>node("Label",{name:value,internal:true}),
    jump=value=>node("Goto",{label:value}),
    ident=value=>node("Ident",{name:value}),
    integer=value=>node("IntLit",{value:BigInt(value)}),
    end=name(),state=name(),groups=[],active=[],body=[],entries=[],dispatch=[];
  const rewrite=(stmt,target)=>{
    if (stmt.kind==="Break") return jump(target);
    if (stmt.kind==="Block") return {...stmt,stmts:stmt.stmts.map(s=>rewrite(s,target))};
    if (stmt.kind==="If") return {...stmt,then:rewrite(stmt.then,target),
      else:stmt.else?rewrite(stmt.else,target):null};
    return stmt;
  };
  const call=(group,out)=>{
    if (!group.prefix.length) return;
    const next=name(),value=group.returns.length;
    group.returns.push(next);
    out.push(node("ExprStmt",{expr:node("Assign",{op:"=",target:ident(state),value:integer(value)})}),
      jump(group.entry),label(next));
  };
  for (let i=0;i<source.items.length;i++) {
    const item=source.items[i];
    if (item.type==="start") {
      const group={entry:name(),end:name(),prefix:[],returns:[]};
      while (source.items[i+1]?.type==="stmt")
        group.prefix.push(rewrite(source.items[++i].stmt,group.end));
      groups.push(group);active.push(group);call(group,body);
    } else if (item.type==="end") {
      if (!active.length) error("end without start in switch");
      body.push(label(active.pop().end));
    } else if (item.type==="case" || item.type==="default") {
      const entry=name(),target=name();
      dispatch.push(item,{type:"stmt",stmt:jump(entry)});
      entries.push(label(entry));
      for (const group of active) call(group,entries);
      entries.push(jump(target));body.push(label(target));
    } else body.push(rewrite(item.stmt,active.at(-1)?.end??end));
  }
  if (active.length) error("Missing end in switch");
  const routines=[];
  for (const group of groups) if (group.prefix.length) {
    const items=group.returns.flatMap((target,i)=>[
      {type:"case",lo:integer(i),hi:null},{type:"stmt",stmt:jump(target)}]);
    routines.push(label(group.entry),...group.prefix,
      node("Switch",{disc:ident(state),items}),jump(end));
  }
  return node("Block",{stmts:[
    node("DeclStmt",{decls:[node("VarDecl",{name:state,type:T.I64,init:null})]}),
    {...source,items:dispatch},jump(end),...body,jump(end),...entries,...routines,label(end)]});
}
