export const KEYDEV_SRC=String.raw`
//The cooperative backend switches tasks only at explicit waits.
#define DFT_CACHE_LINE_WIDTH 128
#define SEMA_FLUSH_VGA_IMAGE 9
#define SEMA_SEMAS_NUM 21

class CSema
{
  Bool val,pad[DFT_CACHE_LINE_WIDTH-1];
};
CSema sys_semas[SEMA_SEMAS_NUM];

U0 VGAFlush()
{
  LBts(&sys_semas[SEMA_FLUSH_VGA_IMAGE],0);
}

Bool Raw(Bool val)
{
  if (!val) VGAFlush;
  return !LBEqu(&Fs->display_flags,DISPLAYf_NOT_RAW,!val);
}

Bool IsRaw()
{
  return !Bt(&Fs->display_flags,DISPLAYf_NOT_RAW);
}

Bool KDRawPutKey(I64 ch,I64)
{
  if (IsRaw) {
    RawPutChar(ch);
    return TRUE;
  } else
    return FALSE;
}

Bool KDRawPutS(U8 *st)
{
  I64 ch;
  if (IsRaw) {
    while (ch=*st++)
      RawPutChar(ch);
    return TRUE;
  } else
    return FALSE;
}

Bool KDInputFilterPutKey(I64 ch,I64 scan_code)
{
  if (Bt(&Fs->task_flags,TASKf_INPUT_FILTER_TASK)) {
    Msg(MSG_KEY_DOWN,ch,scan_code);
    return TRUE;
  } else
    return FALSE;
}

Bool KDInputFilterPutS(U8 *st)
{
  I64 ch;
  if (Bt(&Fs->task_flags,TASKf_INPUT_FILTER_TASK)) {
    while (ch=*st++)
      Msg(MSG_KEY_DOWN,ch,0);
    return TRUE;
  } else
    return FALSE;
}

#define KDF_HAS_DESCS	1
class CKeyDevEntry
{
  CKeyDevEntry *next,*last;
  I64	priority,flags;
  Bool	(*put_key)(I64 ch,I64 sc);
  Bool	(*put_s)(U8 *st);
};

class CKeyDevGlbls
{
  CKeyDevEntry put_key_head;
  U0	(**fp_ctrl_alt_cbs)(I64 sc);
  I64	ctrl_alt_in_irq_flags,
	**ctrl_alt_ret_addr; //addr of ret addr on stack in kbd irq
  U8	**ctrl_alt_no_shift_descs,**ctrl_alt_shift_descs,
	desc[STR_LEN],
	*hndlr;
};
CKeyDevGlbls keydev;

U0 PutKey(I64 ch=0,I64 sc=0)
{//See $LK,"Keyboard Devices",A="HI:Keyboard Devices/System"$.
  CKeyDevEntry *tmpk;
  if (ch || sc) {
    tmpk=keydev.put_key_head.next;
    if (!Bt(&Fs->display_flags,DISPLAYf_SILENT)) {
      if (kbd.scan_code & SCF_SCROLL && sys_focus_task==Fs)
	while (kbd.scan_code & SCF_SCROLL)
	  Yield; //Wait on SCROLL LOCK Key
      while (tmpk!=&keydev.put_key_head) {
	if ((!(sc&SCF_KEY_DESC) || tmpk->flags & KDF_HAS_DESCS) &&
	      (*tmpk->put_key)(ch,sc))
	  break;
	tmpk=tmpk->next;
      }
    }
  }
}

U0 PutS(U8 *st)
{//Use $LK,"Print",A="MN:Print"$(). See $LK,"Keyboard Devices",A="HI:Keyboard Devices/System"$.
//Don't use this.  $LK,"See Print() shortcut.",A="FF:::/Doc/HolyC.DD,DemoHolyC"$
  I64 ch;
  U8 *ptr;
  Bool cont=TRUE;
  if (!st) return;
  CKeyDevEntry *tmpk=keydev.put_key_head.next;
  if (!Bt(&Fs->display_flags,DISPLAYf_SILENT)) {
    if (kbd.scan_code & SCF_SCROLL && sys_focus_task==Fs)
      while (kbd.scan_code & SCF_SCROLL)
	Yield;
    while (cont && tmpk!=&keydev.put_key_head) {
      if (tmpk->put_s) {
	if ((*tmpk->put_s)(st))
	  break;
      } else {
	ptr=st;
	while (ch=*ptr++)
	  if ((*tmpk->put_key)(ch,0))
	    cont=FALSE;
      }
      tmpk=tmpk->next;
    }
  }
}

U0 KeyDevRem(CKeyDevEntry *tmpk)
{//Remove StdOut hook and free.
  QueRem(tmpk);
  Free(tmpk);
}

CKeyDevEntry *KeyDevAdd(Bool (*fp_put_key)(I64 ch,I64 sc),
	Bool (*fp_puts)(U8 *st),I64 priority,Bool key_descs=FALSE)
{//Places hook in StdOut chain. See $LK,"Keyboard Devices",A="HI:Keyboard Devices/System"$.
  CKeyDevEntry *tmpk=keydev.put_key_head.last,*tmpk1;
  if (priority<=0) throw('KeyPrior');
  tmpk1=ACAlloc(sizeof(CKeyDevEntry));
  tmpk1->put_key=fp_put_key;
  tmpk1->put_s=fp_puts;
  tmpk1->priority=priority;
  if (key_descs)
    tmpk1->flags|=KDF_HAS_DESCS;
  while (tmpk->priority>priority)
    tmpk=tmpk->last;
  QueIns(tmpk1,tmpk);
  if (tmpk->priority==priority)
    KeyDevRem(tmpk);
  return tmpk1;
}

Bool KeyConsolePutKey(I64 ch,I64)
{
  if (ch) __putc(ch);
  return TRUE;
}

Bool KeyConsolePutS(U8 *st)
{
  __puts(st);
  return TRUE;
}

U0 KeyOutputHostInit()
{
  if (keydev.put_key_head.next) return;
  QueInit(&keydev.put_key_head);
  keydev.put_key_head.priority=0;
  KeyDevAdd(&KDInputFilterPutKey,&KDInputFilterPutS,0x40000000,FALSE);
  KeyDevAdd(&KDRawPutKey,&KDRawPutS,0x60000000,FALSE);
  KeyDevAdd(&KeyConsolePutKey,&KeyConsolePutS,0x7FFFFFFF,FALSE);
}

U0 Busy(I64 uS)
{//Busy-wait in microseconds on the host clock.
  F64 last=__time_ms_checked,end=last+uS/1000.0,now;
  if (last!=last) throw('Clock');
  do {
    now=__time_ms_checked;
    if (now!=now || now<last) throw('Clock');
    last=now;
  } while (now<end);
}

U0 RawPrint(I64 mS=100,U8 *fmt,...)
{//Print on the raw screen for a loosely timed interval.
  U8 *buf=StrPrintJoin(NULL,fmt,argc,argv);
  Bool old_raw,old_input_filter;
  old_raw=Raw(ON);
  old_input_filter=LBtr(&Fs->task_flags,TASKf_INPUT_FILTER_TASK);
  try {
    "%s",buf;
    Busy(mS<<10);
  } catch {
    LBEqu(&Fs->task_flags,TASKf_INPUT_FILTER_TASK,old_input_filter);
    Raw(old_raw);
    Free(buf);
  }
  LBEqu(&Fs->task_flags,TASKf_INPUT_FILTER_TASK,old_input_filter);
  Raw(old_raw);
  Free(buf);
}
`;
