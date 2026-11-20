//Kernel/BlkDev/DskDrv.HC: C: and B: are drives like any other, so
//Let2BlkDev, BlkDevChk and DrvIsWritable run unchanged.

U0 BlkDevChkChk()
{
  CBlkDev *bd=Let2BlkDev('C');
  "%d %d %d %d\n",bd->type==BDT_ATA,bd->bd_signature==BD_SIGNATURE_VAL,
	bd->blk_size,BlkDevChk(bd)==bd;
  "%d %d\n",DrvIsWritable('C')==bd,DrvIsWritable==Let2BlkDev;
  bd=Let2BlkDev('B');
  "%d %d\n",bd->type==BDT_RAM,!(bd->flags&BDF_READ_ONLY);
  "%d %d\n",BlkDevChk(NULL,FALSE)==NULL,DrvIsWritable('Q')==NULL;
  try {
    BlkDevChk(NULL);
  } catch {
    "%c\n",Fs->except_ch;
    Fs->catch_except=TRUE;
  }
}

BlkDevChkChk;
