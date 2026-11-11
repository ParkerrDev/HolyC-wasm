U0 KeyInit()
{//Check the stock queue sentinel and native output device priorities.
  CKeyDevEntry *tmpk=keydev.put_key_head.next;
  I64 raw=0,filter=0;
  if (keydev.put_key_head.priority) throw('Sentinel');
  while (tmpk!=&keydev.put_key_head) {
    if (tmpk->priority==0x40000000) {
      if (tmpk->put_key!=&KDInputFilterPutKey ||
	    tmpk->put_s!=&KDInputFilterPutS || tmpk->flags)
	throw('Filter');
      filter++;
    }
    if (tmpk->priority==0x60000000) {
      if (tmpk->put_key!=&KDRawPutKey || tmpk->put_s!=&KDRawPutS ||
	    tmpk->flags)
	throw('Raw');
      raw++;
    }
    tmpk=tmpk->next;
  }
  "KeyInit:%d:%d:%d:%d:%d\n",keydev.put_key_head.priority,
	filter,raw,sizeof(CKeyDevEntry),sizeof(CKeyDevGlbls);
}
