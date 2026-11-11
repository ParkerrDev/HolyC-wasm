U64 member_hash=14695981039346656037;
I64 member_cnt=0;

U0 MemberMix(I64 value)
{
  member_hash=(member_hash^value)*1099511628211;
  member_cnt++;
}

U0 MemberLayout()
{
  MemberMix(sizeof(CArrayDim));
  MemberMix(offset(CArrayDim.next));
  MemberMix(offset(CArrayDim.cnt));
  MemberMix(offset(CArrayDim.total_cnt));
  MemberMix(sizeof(CMemberLstMeta));
  MemberMix(offset(CMemberLstMeta.next));
  MemberMix(offset(CMemberLstMeta.str));
  MemberMix(offset(CMemberLstMeta.flags));
  MemberMix(offset(CMemberLstMeta.user_data));
  MemberMix(sizeof(CMemberLst));
  MemberMix(offset(CMemberLst.next));
  MemberMix(offset(CMemberLst.left));
  MemberMix(offset(CMemberLst.right));
  MemberMix(offset(CMemberLst.left_class_base));
  MemberMix(offset(CMemberLst.right_class_base));
  MemberMix(offset(CMemberLst.str));
  MemberMix(offset(CMemberLst.member_class));
  MemberMix(offset(CMemberLst.member_class_base));
  MemberMix(offset(CMemberLst.meta));
  MemberMix(offset(CMemberLst.use_cnt));
  MemberMix(offset(CMemberLst.flags));
  MemberMix(offset(CMemberLst.reg));
  MemberMix(offset(CMemberLst.pad));
  MemberMix(offset(CMemberLst.offset));
  MemberMix(offset(CMemberLst.size));
  MemberMix(offset(CMemberLst.dim));
  MemberMix(offset(CMemberLst.static_data));
  MemberMix(offset(CMemberLst.static_data_rip));
  MemberMix(offset(CMemberLst.dft_val));
  MemberMix(offset(CMemberLst.fun_ptr));
  MemberMix(sizeof(CExternUsage));
  MemberMix(offset(CExternUsage.next));
  MemberMix(offset(CExternUsage.rip));
  MemberMix(sizeof(CHashClass));
  MemberMix(offset(CHashClass.next));
  MemberMix(offset(CHashClass.str));
  MemberMix(offset(CHashClass.type));
  MemberMix(offset(CHashClass.use_cnt));
  MemberMix(offset(CHashClass.src_link));
  MemberMix(offset(CHashClass.idx));
  MemberMix(offset(CHashClass.dbg_info));
  MemberMix(offset(CHashClass.import_name));
  MemberMix(offset(CHashClass.ie_lst));
  MemberMix(offset(CHashClass.size));
  MemberMix(offset(CHashClass.neg_offset));
  MemberMix(offset(CHashClass.member_cnt));
  MemberMix(offset(CHashClass.ptr_stars_cnt));
  MemberMix(offset(CHashClass.raw_type));
  MemberMix(offset(CHashClass.flags));
  MemberMix(offset(CHashClass.member_lst_and_root));
  MemberMix(offset(CHashClass.member_class_base_root));
  MemberMix(offset(CHashClass.last_in_member_lst));
  MemberMix(offset(CHashClass.base_class));
  MemberMix(offset(CHashClass.fwd_class));
  MemberMix(sizeof(CHashFun));
  MemberMix(offset(CHashFun.next));
  MemberMix(offset(CHashFun.str));
  MemberMix(offset(CHashFun.type));
  MemberMix(offset(CHashFun.use_cnt));
  MemberMix(offset(CHashFun.src_link));
  MemberMix(offset(CHashFun.idx));
  MemberMix(offset(CHashFun.dbg_info));
  MemberMix(offset(CHashFun.import_name));
  MemberMix(offset(CHashFun.ie_lst));
  MemberMix(offset(CHashFun.size));
  MemberMix(offset(CHashFun.neg_offset));
  MemberMix(offset(CHashFun.member_cnt));
  MemberMix(offset(CHashFun.ptr_stars_cnt));
  MemberMix(offset(CHashFun.raw_type));
  MemberMix(offset(CHashFun.flags));
  MemberMix(offset(CHashFun.member_lst_and_root));
  MemberMix(offset(CHashFun.member_class_base_root));
  MemberMix(offset(CHashFun.last_in_member_lst));
  MemberMix(offset(CHashFun.base_class));
  MemberMix(offset(CHashFun.fwd_class));
  MemberMix(offset(CHashFun.return_class));
  MemberMix(offset(CHashFun.arg_cnt));
  MemberMix(offset(CHashFun.pad));
  MemberMix(offset(CHashFun.used_reg_mask));
  MemberMix(offset(CHashFun.clobbered_reg_mask));
  MemberMix(offset(CHashFun.exe_addr));
  MemberMix(offset(CHashFun.ext_lst));
}

U0 MemberLookup()
{
  I64 i,j,k,mask;
  CHashClass classes[3];
  CMemberLst nodes[6],*tmpm;
  CMemberLstMeta meta[3],*tmp_meta;
  U8 query[2];
  MemSet(classes,0,sizeof(classes));
  MemSet(nodes,0,sizeof(nodes));
  MemSet(meta,0,sizeof(meta));
  classes[0].base_class=&classes[1];
  classes[1].base_class=&classes[2];
  nodes[0].str="M";nodes[1].str="Z";nodes[2].str="A";
  nodes[3].str="M";nodes[4].str="X";nodes[5].str="D";
  nodes[0].left=&nodes[1];nodes[0].right=&nodes[2];
  nodes[3].left=&nodes[4];nodes[3].right=&nodes[5];
  query[1]=0;
  for (mask=0;mask<4;mask++) {
    classes[0].member_lst_and_root=NULL;
    classes[1].member_lst_and_root=NULL;
    if (mask&1) classes[0].member_lst_and_root=&nodes[0];
    if (mask&2) classes[1].member_lst_and_root=&nodes[3];
    for (i=0;i<6;i++) nodes[i].use_cnt=0xFFFFFFFE;
    for (k=0;k<3;k++)
      for (i=32;i<128;i++) {
	query[0]=i;
	tmpm=MemberFind(query,&classes[0]);
	j=-1;
	if (tmpm) j=tmpm-nodes;
	MemberMix(j);
	for (j=0;j<6;j++) MemberMix(nodes[j].use_cnt);
      }
  }
  meta[0].str="same";meta[0].user_data=17;
  meta[1].str="same";meta[1].user_data=29;
  meta[2].str="other";meta[2].user_data=I64_MIN;
  meta[0].next=&meta[1];meta[1].next=&meta[2];
  for (i=0;i<4;i++) {
    nodes[0].meta=NULL;
    if (i<3) nodes[0].meta=&meta[i];
    for (j=0;j<4;j++) {
      switch (j) {
	case 0:
	  tmp_meta=MemberMetaFind("same",&nodes[0]);
	  MemberMix(MemberMetaData("same",&nodes[0]));
	  break;
	case 1:
	  tmp_meta=MemberMetaFind("other",&nodes[0]);
	  MemberMix(MemberMetaData("other",&nodes[0]));
	  break;
	case 2:
	  tmp_meta=MemberMetaFind("Same",&nodes[0]);
	  MemberMix(MemberMetaData("Same",&nodes[0]));
	  break;
	case 3:
	  tmp_meta=MemberMetaFind("missing",&nodes[0]);
	  MemberMix(MemberMetaData("missing",&nodes[0]));
	  break;
      }
      k=-1;
      if (tmp_meta) k=tmp_meta-meta;
      MemberMix(k);
    }
  }
  classes[0].member_class_base_root=&nodes[0];
  nodes[0].member_class_base=&classes[1];
  nodes[0].left_class_base=&nodes[1];
  nodes[0].right_class_base=&nodes[2];
  nodes[1].member_class_base=&classes[0];
  nodes[2].member_class_base=&classes[2];
  for (i=0;i<3;i++) {
    tmpm=MemberClassBaseFind(&classes[i],&classes[0]);
    MemberMix(tmpm-nodes);
  }
  MemberMix(!MemberClassBaseFind(NULL,&classes[0]));
  classes[0].member_class_base_root=NULL;
  MemberMix(!MemberClassBaseFind(&classes[0],&classes[0]));
}

U0 MemberCompare()
{
  I64 i,j,k,mask,cnt,limit,phase;
  CMemberLst left[2],right[2],*tmpl,*tmpr;
  CHashClass classes[2];
  MemSet(left,0,sizeof(left));MemSet(right,0,sizeof(right));
  MemSet(classes,0,sizeof(classes));
  left[0].next=&left[1];right[0].next=&right[1];
  left[0].str=right[0].str="first";
  left[1].str=right[1].str="last";
  for (phase=0;phase<4;phase++)
    for (i=0;i<8;i++)
      for (j=0;j<8;j++) {
	left[0].flags=i;right[0].flags=j;
	if (phase&1) left[0].flags|=0xFFF8;
	if (phase&2) right[0].flags|=0xFFF8;
	for (mask=0;mask<16;mask++) {
	  left[0].str=right[0].str="first";
	  left[0].member_class=right[0].member_class=&classes[0];
	  left[0].member_class_base=right[0].member_class_base=&classes[0];
	  if (mask&1) right[0].str="different";
	  if (mask&2) right[0].member_class=&classes[1];
	  if (mask&4) right[0].member_class_base=&classes[1];
	  left[0].dft_val=right[0].dft_val=42;
	  if (mask&8) right[0].dft_val=43;
	  if (i&MLF_STR_DFT_AVAILABLE) left[0].dft_val="value";
	  if (j&MLF_STR_DFT_AVAILABLE) {
	    right[0].dft_val="value";
	    if (mask&8) right[0].dft_val="other";
	  }
	  for (k=0;k<6;k++) {
	    limit=k-1;
	    if (k==5) limit=I64_MIN;
	    MemberMix(MemberLstCmp(left,right,limit));
	  }
	}
      }
  MemSet(left,0,sizeof(left));MemSet(right,0,sizeof(right));
  left[0].next=&left[1];right[0].next=&right[1];
  left[0].str=left[1].str=right[0].str=right[1].str="part";
  for (i=0;i<3;i++)
    for (j=0;j<3;j++) {
      tmpl=tmpr=NULL;
      if (i<2) tmpl=left+i;
      if (j<2) tmpr=right+j;
      for (cnt=-1;cnt<4;cnt++)
	MemberMix(MemberLstCmp(tmpl,tmpr,cnt));
    }
}

U0 Member()
{
  member_hash=14695981039346656037;member_cnt=0;
  MemberLayout;
  MemberLookup;
  MemberCompare;
  "Member:%016X:%d\n",member_hash,member_cnt;
}

Member;
