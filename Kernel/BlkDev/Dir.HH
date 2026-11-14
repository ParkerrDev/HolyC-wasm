
#define CDIR_FILENAME_LEN 38
#define BD_SIGNATURE_VAL 'BDSV'
#define BDF_INIT_IN_PROGRESS 0x80
#define FSt_NULL 0
#define FSt_REDSEA 1
#define FSt_FAT32 2
#define FSt_ISO9660 3
#define FSt_NTFS 4
#define FSt_UNKNOWN 5
#define FSt_TYPES_NUM 6
#define FSG_TYPE_MASK 0x7FFF
#define FSt_HOST 0x1000
#define BDT_HOST 0x1000
#define RS_ATTR_READ_ONLY 0x01
#define RS_ATTR_HIDDEN 0x02
#define RS_ATTR_SYSTEM 0x04
#define RS_ATTR_VOL_ID 0x08
#define RS_ATTR_DIR 0x10
#define RS_ATTR_ARCHIVE 0x20
#define RS_ATTR_LONG_NAME 0x0F
#define RS_ATTR_LONG_NAME_MASK 0x3F
#define RS_ATTR_DELETED 0x100
#define RS_ATTR_RESIDENT 0x200
#define RS_ATTR_COMPRESSED 0x400
#define RS_ATTR_CONTIGUOUS 0x800
#define RS_ATTR_FIXED 0x1000
#define FUf_JUST_DIRS 10
#define FUf_JUST_FILES 11
#define FUf_Z_OR_NOT_Z 18
#define FUf_SCAN_PARENTS 20
#define FUF_JUST_DIRS 0x400
#define FUF_JUST_FILES 0x800
#define FUF_Z_OR_NOT_Z 0x40000
#define FUF_SCAN_PARENTS 0x100000
#define FUG_FILE_FIND (FUF_JUST_DIRS|FUF_JUST_FILES|FUF_Z_OR_NOT_Z|\
  FUF_SCAN_PARENTS)
extern class CFile;
extern class CFAT32FileInfoSect;
extern class CCacheBlk;

public class CDirEntry
{
  CDirEntry *next,*parent,*sub;
  U8	*full_name;
  I64	user_data,user_data2;

  U0	start;
  U16	attr;
  U8	name[CDIR_FILENAME_LEN];
  I64	clus,size;
  CDate datetime;
};
public class CBlkDev
{
  CBlkDev *lock_fwding; //If two blkdevs on same controller, use just one lock
  I64	locked_flags;
  U32	bd_signature,
	type,flags;
  U8	first_drv_let,unit,pad[2];
  U32	base0,base1,
	blk_size;
  I64	drv_offset,init_root_dir_blks,
	max_blk;
  U16	*dev_id_record;
  U8	*RAM_dsk,
	*file_dsk_name;
  CFile *file_dsk;
  CTask *owning_task;
  F64	last_time;
  U32	max_reads,max_writes;
};

class CFreeLst
{
  CFreeLst *next,*last;
  I64	start,size;
};

#define DRVS_NUM		26

#define DRV_SIGNATURE_VAL	'DVSV'
public class CDrv
{
//Don't access ->drv_let directly in case a drive has been remapped.
  //Use $LK,"Drv2Let",A="MN:Drv2Let"$().
  I64	locked_flags;
  U32	dv_signature;
  U8	drv_let,pad;
  U16	fs_type;
  I64	drv_offset,
	size,
	prt_num,
	file_system_info_sect,
	fat1,fat2,
	root_clus,
	data_area,
	spc; //sectors per clus
  CDate fat32_local_time_offset;
  CTask *owning_task;
  CBlkDev *bd;

  CFAT32FileInfoSect *fis;
  I64	fat_blk_dirty,
	cur_fat_blk_num;
  U32	*cur_fat_blk;
  CFreeLst *next_free,*last_free;
};

public class CBlkDevGlbls
{
  CBlkDev *blkdevs;
  U8	*dft_iso_filename;	//$TX,"\"::/Tmp/CDDVD.ISO\"",D="DFT_ISO_FILENAME"$
  U8	*dft_iso_c_filename;	//$TX,"\"::/Tmp/CDDVD.ISO.C\"",D="DFT_ISO_C_FILENAME"$
  U8	*tmp_filename;
  U8	*home_dir;
  CCacheBlk *cache_base,*cache_ctrl,**cache_hash_table;
  I64	cache_size,read_cnt,write_cnt;
  CDrv	*drvs,*let_to_drv[32];
  I64	mount_ide_auto_cnt,
	ins_base0,ins_base1;	//Install cd/dvd controller.
  U8	boot_drv_let,first_hd_drv_let,first_dvd_drv_let;
  Bool	dvd_boot_is_good,ins_unit,pad[3];
};

public class CDirContext
{
  CDrv	*old_dv,*dv;
  U8	*old_dir,*mask;
};
