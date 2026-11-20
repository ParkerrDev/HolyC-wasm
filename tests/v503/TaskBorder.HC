U8 child_border;

U0 BorderChild(I64)
{
  child_border=Fs->border_attr;
}

CTask *border_child=Spawn(&BorderChild);
DeathWait(&border_child);
"%X %d\n",child_border,child_border==DrvTextAttrGet(':');
