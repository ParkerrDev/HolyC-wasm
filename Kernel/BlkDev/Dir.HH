
#define CDIR_FILENAME_LEN 38
#define BLK_SIZE_BITS	9
#define BLK_SIZE	(1<<BLK_SIZE_BITS)
#define INVALID_CLUS (-1)
#define BDlf_LOCKED		0
#define DVlf_LOCKED	0
#define BD_SIGNATURE_VAL 'BDSV'
//See $LK,"ST_BLKDEV_TYPES",A="MN:ST_BLKDEV_TYPES"$
#define BDT_NULL		0
#define BDT_RAM			1
#define BDT_ATA			2
#define BDT_ISO_FILE_READ	3
#define BDT_ISO_FILE_WRITE	4
#define BDT_ATAPI		5
#define BDT_TYPES_NUM		6

#define BDF_REMOVABLE		0x001
#define BDF_INITIALIZED		0x002
#define BDF_READ_ONLY		0x004
#define BDF_READ_ONLY_OVERRIDE	0x008
#define BDF_LAST_WAS_WRITE	0x010
#define BDF_READ_CACHE		0x020
#define BDF_FMT			0x040
#define BDF_INIT_IN_PROGRESS	0x080
#define BDF_EXT_SIZE		0x100

#define BDf_REMOVABLE		0
#define BDf_INITIALIZED		1
#define BDf_READ_ONLY		2
#define BDf_READ_ONLY_OVERRIDE	3
#define BDf_LAST_WAS_WRITE	4
#define BDf_READ_CACHE		5
#define BDf_FMT			6
#define BDf_INIT_IN_PROGRESS	7
#define BDf_EXT_SIZE		8
#define FSt_NULL 0
#define FSt_REDSEA 1
#define FSt_FAT32 2
#define FSt_ISO9660 3
#define FSt_NTFS 4
#define FSt_UNKNOWN 5
#define FSt_TYPES_NUM 6
#define FSG_TYPE_MASK 0x7FFF
#define FSt_HOST 0x1000
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
//File Util Flags
//See $LK,"ST_FILE_UTIL_FLAGS",A="MN:ST_FILE_UTIL_FLAGS"$
#define FUf_RECURSE		0
#define FUf_DIFF		1
#define FUf_DEL			1
#define FUf_IGNORE		2
#define FUf_ALL			3
#define FUf_CANCEL		4
#define FUf_REPLACE		5
#define FUf_RISKY		5
#define FUf_PUBLIC		6
#define FUf_MAP			7
#define FUf_EXPAND		8
#define FUf_SINGLE		9
#define FUf_JUST_DIRS		10
#define FUf_JUST_FILES		11
#define FUf_JUST_TXT		12
#define FUf_JUST_DD		13
#define FUf_JUST_SRC		14
#define FUf_JUST_AOT		15
#define FUf_JUST_JIT		16
#define FUf_JUST_GR		17
#define FUf_Z_OR_NOT_Z		18
#define FUf_CLUS_ORDER	19
#define FUf_SCAN_PARENTS	20
#define FUf_FLATTEN_TREE	21
#define FUf_WHOLE_LABELS	22
#define FUf_WHOLE_LABELS_BEFORE	23
#define FUf_WHOLE_LABELS_AFTER	24

#define FUF_RECURSE		0x0000001 //r
#define FUF_DIFF		0x0000002 //d
#define FUF_DEL			0x0000002 //d
#define FUF_IGNORE		0x0000004 //i
#define FUF_ALL			0x0000008 //a
#define FUF_CANCEL		0x0000010 //c
#define FUF_REPLACE		0x0000020 //R
#define FUF_RISKY		0x0000020 //R
#define FUF_PUBLIC		0x0000040 //p
#define FUF_MAP			0x0000080 //m
#define FUF_EXPAND		0x0000100 //x
#define FUF_SINGLE		0x0000200 //s
#define FUF_JUST_DIRS		0x0000400 //D
#define FUF_JUST_FILES		0x0000800 //F
#define FUF_JUST_TXT		0x0001000 //T
#define FUF_JUST_DD		0x0002000 //$$
#define FUF_JUST_SRC		0x0004000 //S
#define FUF_JUST_AOT		0x0008000 //A
#define FUF_JUST_JIT		0x0010000 //J
#define FUF_JUST_GR		0x0020000 //G
#define FUF_Z_OR_NOT_Z		0x0040000 //Z
#define FUF_CLUS_ORDER	0x0080000 //O Move disk head one direction
#define FUF_SCAN_PARENTS	0x0100000 //P
#define FUF_FLATTEN_TREE	0x0200000 //f
#define FUF_WHOLE_LABELS	0x0400000 //l
#define FUF_WHOLE_LABELS_BEFORE	0x0800000 //lb
#define FUF_WHOLE_LABELS_AFTER	0x1000000 //la

#define FUG_FILES_FIND	(FUF_RECURSE|FUF_SINGLE|FUF_CLUS_ORDER|\
  FUF_JUST_DIRS|FUF_JUST_FILES|FUF_JUST_TXT|FUF_JUST_DD|\
  FUF_JUST_SRC|FUF_JUST_AOT|FUF_JUST_JIT|FUF_JUST_GR|FUF_FLATTEN_TREE)
#define FUG_FILE_FIND	(FUF_JUST_DIRS|FUF_JUST_FILES|FUF_Z_OR_NOT_Z|\
  FUF_SCAN_PARENTS)

#define FILEMASK_JIT	"*.HC*;*.HH*"
#define FILEMASK_AOT	"*.HC*;*.HH*;*.PRJ*"
#define FILEMASK_SRC	"*.HC*;*.HH*;*.IN*;*.PRJ*"
#define FILEMASK_DD	FILEMASK_SRC ";*.DD*"
#define FILEMASK_TXT	FILEMASK_DD ";*.TXT*"
#define FILEMASK_GR	"*.GR*"
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
#define CDIR_SIZE (sizeof(CDirEntry)-offset(CDirEntry.start))
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

#define FFB_NEXT_BLK		I64_MAX

#define FF_WRITE		1
#define FF_NEW_FILE		2
#define FF_BUF_DIRTY		4
#define FF_NEEDS_WRITE		8
#define FF_CONTIGUOUS		16
#define FF_USE_OLD_DATETIME	32

public class CFile //See $LK,"::/Demo/Dsk/DataBase.HC"$.
{
  I64	flags;
  CDirEntry de;
  CDrv	*dv;
  I64	fblk_num,clus,file_clus_num,max_blk;
  U8	*clus_buf;
};
