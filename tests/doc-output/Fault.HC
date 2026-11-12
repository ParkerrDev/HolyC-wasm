CDoc *parse_doc=NULL;
CTask *parse_owner=NULL;
Bool parse_done=FALSE;
I64 parse_mode=0,parse_error=0,parse_type=0;
import U0 ParseFaultMark(I64 phase,CTask *owner,I64 error,I64 type);
import U0 ParseFaultPtr(U8 *ptr,CTask *owner);

U0 ParseWait(U8 *)
{
  while (TRUE) Sleep(1000);
}

U0 ParseFaultBody()
{
  CDocEntry *entry=NULL;
  U8 *st="TX,\"plain\"",*except=Fs->next_except;
  switch (parse_mode) {
    case 1:
      st="TR,\"tree\",A=\"aux\",D=\"DEF\",HTML=\"url\",LM=\"L;\",RM=\"R;\"";
      break;
    case 2:
      st="CB,\"one\" \"two\" \"three\"";
      break;
    case 3:
      st="MA,LM=\"action;\"";
      break;
    case 4:
      st="LS,\"list\",D=\"VALUES\"";
      break;
    case 5:
      st="TX,\"owned\",A=";
      break;
    case 6:
      st="TX,\"owned\",A='123456789'";
      break;
    case 7:
      st="TX,\"owned\",A=\"aux\",U=13";
      break;
    case 8:
      st="TX,\"owned\" #define VALUE 13";
      break;
  }
  parse_error=0;parse_type=-1;
  ParseFaultMark(0,parse_doc->mem_task,0,-1);
  try entry=PrsDollarCmd(parse_doc,st);
  catch {
    parse_error=Fs->except_ch;
    Fs->catch_except=TRUE;
  }
  ParseFaultMark(1,parse_doc->mem_task,parse_error,-1);
  if (Fs->next_except!=except) throw('PrsChain');
  if (entry) {
    parse_type=entry->type_u8;
    ParseFaultPtr(entry,parse_doc->mem_task);
    ParseFaultPtr(entry->tag,parse_doc->mem_task);
    ParseFaultPtr(entry->aux_str,parse_doc->mem_task);
    ParseFaultPtr(entry->define_str,parse_doc->mem_task);
    ParseFaultPtr(entry->html_link,parse_doc->mem_task);
    ParseFaultPtr(entry->left_macro,parse_doc->mem_task);
    ParseFaultPtr(entry->right_macro,parse_doc->mem_task);
    ParseFree(entry);
  }
  ParseFaultMark(2,parse_doc->mem_task,parse_error,parse_type);
}

U0 ParseFaultTask(U8 *)
{
  ParseFaultBody;
  parse_done=TRUE;
  while (TRUE) Yield;
}

U0 ParseFaultSetup()
{
  Raw(OFF);
  parse_doc=CAlloc(sizeof(CDoc));
}

I64 ParseFault(I64 mode,Bool foreign,Bool child)
{
  CTask *task;
  parse_mode=mode;
  parse_doc->mem_task=Fs;
  if (foreign) {
    parse_owner=Spawn(&ParseWait,NULL,"Doc owner");
    parse_doc->mem_task=parse_owner;
  }
  if (child) {
    parse_done=FALSE;
    task=Spawn(&ParseFaultTask,NULL,"Parse");
    while (!parse_done) Yield;
    Kill(task);
  } else
    ParseFaultBody;
  if (foreign) {Kill(parse_owner);parse_owner=NULL;}
  return parse_error;
}

U0 ParseFaultDone()
{
  Free(parse_doc);parse_doc=NULL;
}
