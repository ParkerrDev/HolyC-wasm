
I64 MemberMetaData(U8 *needle_str,CMemberLst *haystack_member_lst)
{//Find meta data name, return meta data val. See $LK,"::/Demo/ClassMeta.HC"$.
  CMemberLstMeta *meta=haystack_member_lst->meta;
  while (meta) {
    if (!StrCmp(meta->str,needle_str))
      return meta->user_data;
    meta=meta->next;
  }
  return 0;
}

CMemberLstMeta *MemberMetaFind(U8 *needle_str,CMemberLst *haystack_member_lst)
{//Find meta data name, return meta data struct. See $LK,"::/Demo/ClassMeta.HC"$.
  CMemberLstMeta *meta=haystack_member_lst->meta;
  while (meta) {
    if (!StrCmp(meta->str,needle_str))
      return meta;
    meta=meta->next;
  }
  return NULL;
}

CMemberLst *MemberFind(U8 *needle_str,CHashClass *haystack_class)
{//Find class member. See $LK,"ClassRep",A="MN:ClassRep"$() and $LK,"DocForm",A="MN:DocForm"$().
  I64 i;
  CMemberLst *tmpm;
  do {
    tmpm=haystack_class->member_lst_and_root;
    while (tmpm) {
      if (!(i=StrCmp(tmpm->str,needle_str))) {
	tmpm->use_cnt++;
	return tmpm;
      }
      if (i<=0)
	tmpm=tmpm->left;
      else
	tmpm=tmpm->right;
    }
  } while (haystack_class=haystack_class->base_class);
  return NULL;
}

CMemberLst *MemberClassBaseFind(CHashClass *needle_class,
	CHashClass *haystack_class)
{//Find class member class base. For finding dup class local vars.
  CMemberLst *tmpm;
  tmpm=haystack_class->member_class_base_root;
  while (tmpm) {
    if (needle_class==tmpm->member_class_base)
      return tmpm;
    if (needle_class<tmpm->member_class_base)
      tmpm=tmpm->left_class_base;
    else
      tmpm=tmpm->right_class_base;
  }
  return NULL;
}

Bool  MemberLstCmp(CMemberLst *tmpm1,CMemberLst *tmpm2,I64 cnt=I64_MAX)
{
  while (tmpm1 && tmpm2 && cnt--) {
    if (StrCmp(tmpm1->str,tmpm2->str) ||
	  tmpm1->member_class!=tmpm2->member_class ||
	  tmpm1->member_class_base!=tmpm2->member_class_base)
      return FALSE;
    if (tmpm1->flags&MLF_DFT_AVAILABLE || tmpm2->flags&MLF_DFT_AVAILABLE) {
      if (tmpm1->flags&(MLF_DFT_AVAILABLE|MLF_STR_DFT_AVAILABLE)!=
	    tmpm2->flags&(MLF_DFT_AVAILABLE|MLF_STR_DFT_AVAILABLE))
	return FALSE;
      if (tmpm1->flags&MLF_STR_DFT_AVAILABLE) {
	if (StrCmp(tmpm1->dft_val,tmpm2->dft_val))
	  return FALSE;
      } else if (tmpm1->dft_val!=tmpm2->dft_val)
	return FALSE;
    }
    tmpm1=tmpm1->next;
    tmpm2=tmpm2->next;
  }
  if (cnt<0 || !tmpm1 && !tmpm2)
    return TRUE;
  else
    return FALSE;
}

//V5.03 Compiler/OptLib.HC OptClassFwd.
CHashClass *OptClassFwd(CHashClass *tmpc)
{//Class forwarding for unions and subclasses.
  CHashClass *tmpc1;
  while (tmpc1=tmpc->fwd_class)
    tmpc=tmpc1;
  return tmpc;
}

I64 MemberLstSize(CHashClass *tmpc)
{
  CMemberLst *tmpm;
  CMemberLstMeta *tmp_meta;
  I64 res=0;
  tmpm=tmpc->member_lst_and_root;
  while (tmpm) {
    res+=MSize2(tmpm->str);
    res+=LinkedLstSize(tmpm->dim.next);
    if (tmpm->flags & MLF_STR_DFT_AVAILABLE)
      res+=MSize2(tmpm->dft_val);
    if (tmpm->flags & MLF_FUN)
      res+=HashEntrySize2(tmpm->fun_ptr-tmpm->fun_ptr->ptr_stars_cnt);
    tmp_meta=tmpm->meta;
    while (tmp_meta) {
      res+=MSize2(tmp_meta->str);
      if (tmp_meta->flags&MLMF_IS_STR)
	res+=MSize2(tmp_meta->user_data);
      res+=MSize2(tmp_meta);
      tmp_meta=tmp_meta->next;
    }
    res+=MSize2(tmpm);
    tmpm=tmpm->next;
  }
  return res;
}
