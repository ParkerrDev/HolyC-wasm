//V5.03 DskBlkDev.HC's BlkDevChk and Let2BlkDev and DskDrv.HC's
//DrvIsWritable. The browser's volumes are drives like any other (Dir.HC).

CBlkDev *BlkDevChk(CBlkDev *bd,Bool except=TRUE)
{//Check for valid BlkDev. Throw exception.
  if (!bd || bd->bd_signature!=BD_SIGNATURE_VAL ||
	!(BDT_NULL<bd->type<BDT_TYPES_NUM)) {
    if (except)
      throw('BlkDev');
    else
      return NULL;
  } else
    return bd;
}

CBlkDev *Let2BlkDev(U8 drv_let=0,Bool except=TRUE)
{//Drv letter to BlkDev ptr.
  CDrv *dv;
  if (dv=Let2Drv(drv_let,except))
    return BlkDevChk(dv->bd,except);
  else
    return NULL;
}

CBlkDev *DrvIsWritable(U8 drv_let=0,Bool except=FALSE)
{//Is drive writable?
  CBlkDev *bd;
  if (!(bd=Let2BlkDev(drv_let,except)) || bd->flags & BDF_READ_ONLY) {
    if (except)
      throw('Drv');
    else
      return NULL;
  } else
    return bd;
}

//V5.03 DskDrv.HC's DrvLock and DrvUnlock without BlkDevLock and
//BlkDevUnlock: a host volume's CBlkDev has this one drive and is none of
//his types.
Bool DrvLock(CDrv *dv)
{//Make this task have exclusive access to drv & BlkDev.
  DrvChk(dv);
  if (!Bt(&dv->locked_flags,DVlf_LOCKED) || dv->owning_task!=Fs) {
    while (LBts(&dv->locked_flags,DVlf_LOCKED))
      Yield;
    dv->owning_task=Fs;
    return TRUE;
  } else
    return FALSE;
}

Bool DrvUnlock(CDrv *dv,Bool rst=FALSE)
{//Release exclusive lock on access to drv & BlkDev.
  no_warn rst;
  DrvChk(dv);
  if (Bt(&dv->locked_flags,DVlf_LOCKED) && dv->owning_task==Fs) {
    dv->owning_task=NULL;
    LBtr(&dv->locked_flags,DVlf_LOCKED);
    Yield; //Prevent deadlock
    return TRUE;
  } else
    return FALSE;
}

//V5.03 DskDrv.HC's Let2BlkDevType and DrvTextAttrGet: a drive's colour from
//its letter, as his drives are lettered by type.

I64 Let2BlkDevType(U8 drv_let)
{//Drv letter to BlkDev Type. drv_let=0 not allowed. See $LK,"BDT_NULL",A="MN:BDT_NULL"$.
  drv_let=Let2Let(drv_let);
  if ('A'<=drv_let<='B')
    return BDT_RAM;
  if ('C'<=drv_let<='L')
    return BDT_ATA;
  if ('M'<=drv_let<='P')
    return BDT_ISO_FILE_READ;
  if ('Q'<=drv_let<='S')
    return BDT_ISO_FILE_WRITE;
  if ('T'<=drv_let<='Z')
    return BDT_ATAPI;
  return BDT_NULL;
}

U8 blkdev_text_attr[BDT_TYPES_NUM]={BLACK,LTCYAN,WHITE,LTGREEN,LTRED,LTBLUE};
U8 drv_text_attr[3]={BLACK,BLUE,RED};

U8 DrvTextAttrGet(U8 drv_let=0)
{//Get color of drive.
  drv_let=Let2Let(drv_let);
  if ('A'<=drv_let<='Z')
    return blkdev_text_attr[Let2BlkDevType(drv_let)]<<4|
	  drv_text_attr[drv_let%sizeof(drv_text_attr)];
  else
    return BLACK<<4|WHITE;
}
