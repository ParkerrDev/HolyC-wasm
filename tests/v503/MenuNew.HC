U0 MenuNewTest()
{
  CMenu *m=MenuNew("File {Abort();Exit();}Play {Restart();Pause();}");
  CMenuEntry *tmpme;
  tmpme=MenuEntryFind(m,"File/Exit");
  "%s %d %d %d %d\n",tmpme->name,tmpme->msg_code,tmpme->arg1,tmpme->arg2,
	tmpme->dir;
  tmpme=MenuEntryFind(m,"Play");
  "%s %d\n",tmpme->name,tmpme->dir;
  tmpme=tmpme->sub;
  while (tmpme) {
    "%s %d\n",tmpme->name,MenuEntryWidth(tmpme);
    tmpme=tmpme->next;
  }
  "%d\n",MenuEntryFind(m,"Play/None");
  MenuDel(m);
}

MenuNewTest;
